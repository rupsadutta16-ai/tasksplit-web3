import { ethers } from "hardhat";

async function main() {
  const Contract = await ethers.getContractFactory("TaskSplit");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  console.log("✅ Contract deployed at:", await contract.getAddress());
}

main().catch(console.error);
