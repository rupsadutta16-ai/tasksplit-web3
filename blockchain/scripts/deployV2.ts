import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("Deploying TaskSplit V2 with Genesis and Standard NFT support...");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log(`Deploying contracts with account: ${deployer.address} on Chain ID: ${chainId}`);

    // 1. Deploy Genesis Verifier NFT (Existing)
    const GenesisVerifierNFT = await ethers.getContractFactory("GenesisVerifierNFT");
    const genesisNFT = await GenesisVerifierNFT.deploy();
    await genesisNFT.waitForDeployment();
    const genesisNFTAddress = await genesisNFT.getAddress();
    console.log(`GenesisVerifierNFT deployed to: ${genesisNFTAddress}`);

    // 2. Deploy Standard Verifier NFT (New)
    const StandardVerifierNFT = await ethers.getContractFactory("StandardVerifierNFT");
    const standardNFT = await StandardVerifierNFT.deploy();
    await standardNFT.waitForDeployment();
    const standardNFTAddress = await standardNFT.getAddress();
    console.log(`StandardVerifierNFT deployed to: ${standardNFTAddress}`);

    // 3. Deploy TaskSplit V2 with both NFT addresses
    const TaskSplitV2 = await ethers.getContractFactory("TaskSplitV2");
    const taskSplit = await TaskSplitV2.deploy(genesisNFTAddress, standardNFTAddress);
    await taskSplit.waitForDeployment();
    const taskSplitAddress = await taskSplit.getAddress();
    console.log(`TaskSplitV2 deployed to: ${taskSplitAddress}`);

    // 4. Setup Permissions: TaskSplitV2 should be able to mint Standard NFTs
    console.log("Transferring StandardVerifierNFT ownership to TaskSplitV2...");
    const transferTx = await standardNFT.transferOwnership(taskSplitAddress);
    await transferTx.wait();

    // 5. Mint some Genesis NFTs to hardcoded verifiers if needed (Optional for demo)
    console.log(`Minting genesis NFT to deployer: ${deployer.address}`);
    const mintTx = await genesisNFT.mint(deployer.address);
    await mintTx.wait();

    console.log("\nDeployment Summary:");
    console.log("===================");
    console.log(`GenesisVerifierNFT: ${genesisNFTAddress}`);
    console.log(`StandardVerifierNFT: ${standardNFTAddress}`);
    console.log(`TaskSplitV2: ${taskSplitAddress}`);

    // 6. Automatically update frontend/src/utils/contract.js
    const contractJsPath = path.join(__dirname, "../../frontend/src/utils/contract.js");
    const contractJsContent = `import { ethers } from "ethers";
import TaskSplitV2 from "../artifacts/TaskSplitV2.json";
import GenesisNFT from "../artifacts/GenesisVerifierNFT.json";
import StandardNFT from "../artifacts/StandardVerifierNFT.json";

export const CONTRACT_ADDRESS = "${taskSplitAddress}";
export const GENESIS_NFT_ADDRESS = "${genesisNFTAddress}";
export const STANDARD_NFT_ADDRESS = "${standardNFTAddress}";
export const EXPECTED_CHAIN_ID = ${chainId}; 

export const CONTRACT_ABI = TaskSplitV2.abi;
export const GENESIS_NFT_ABI = GenesisNFT.abi;
export const STANDARD_NFT_ABI = StandardNFT.abi;

export const getContract = async (signerOrProvider) => {
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

export const getGenesisNFT = async (signerOrProvider) => {
    return new ethers.Contract(GENESIS_NFT_ADDRESS, GENESIS_NFT_ABI, signerOrProvider);
}

export const getStandardNFT = async (signerOrProvider) => {
    return new ethers.Contract(STANDARD_NFT_ADDRESS, STANDARD_NFT_ABI, signerOrProvider);
}
`;

    fs.writeFileSync(contractJsPath, contractJsContent);
    console.log(`Successfully updated: ${contractJsPath}`);

    // 7. Copy ABIs to frontend artifacts
    const blockchainArtifacts = path.join(__dirname, "../artifacts/contracts");
    const frontendArtifacts = path.join(__dirname, "../../frontend/src/artifacts");

    const filesToCopy = [
        "TaskSplitV2.sol/TaskSplitV2.json",
        "GenesisVerifierNFT.sol/GenesisVerifierNFT.json",
        "StandardVerifierNFT.sol/StandardVerifierNFT.json"
    ];

    if (!fs.existsSync(frontendArtifacts)) {
        fs.mkdirSync(frontendArtifacts, { recursive: true });
    }

    filesToCopy.forEach(file => {
        const src = path.join(blockchainArtifacts, file);
        const dest = path.join(frontendArtifacts, path.basename(file));
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied ${path.basename(file)} to frontend`);
        }
    });

    console.log("\nSync complete. Frontend is ready.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
