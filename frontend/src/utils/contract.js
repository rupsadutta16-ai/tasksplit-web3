import { ethers } from "ethers";
import TaskSplitV2 from "../artifacts/TaskSplitV2.json";
import GenesisNFT from "../artifacts/GenesisVerifierNFT.json";
import StandardNFT from "../artifacts/StandardVerifierNFT.json";

export const CONTRACT_ADDRESS = "0xe07CFEdb9ba91FB390f2137dDdaf3eEabc7605a6";
export const GENESIS_NFT_ADDRESS = "0x3AA663056633d46411B84Cf4Cc0924549F345468";
export const STANDARD_NFT_ADDRESS = "0x3EF573A459cc26b35950602eB911F0a515De5727";
export const EXPECTED_CHAIN_ID = 421614; 

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
