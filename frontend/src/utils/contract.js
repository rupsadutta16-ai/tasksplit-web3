import { ethers } from "ethers";
import TaskSplitV2 from "../artifacts/TaskSplitV2.json";
import GenesisNFT from "../artifacts/GenesisVerifierNFT.json";
import StandardNFT from "../artifacts/StandardVerifierNFT.json";

export const CONTRACT_ADDRESS = "0xb52a4Aa26B34B62dFcC0971DF7c743D1C8d80A41";
export const GENESIS_NFT_ADDRESS = "0x97699D2f74FEfF970D4D0103D7a63C4D754E4B5B";
export const STANDARD_NFT_ADDRESS = "0x50781B827C291e6569B7aC63918F89D60E16B16F";
export const EXPECTED_CHAIN_ID = 5003; 

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
