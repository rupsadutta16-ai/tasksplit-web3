import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();
import "@nomicfoundation/hardhat-toolbox";       // ✅ load the full toolbox


const config: HardhatUserConfig = {
  sourcify: {
    enabled: true
  },
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    hardhat: {}, 

    //     hardhatMainnet: {
    //       type: "edr-simulated",
    //       chainType: "l1",
    //     },
    //     hardhatOp: {
    //       type: "edr-simulated",
    //       chainType: "op",
    //     },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    
  },
  
  etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY
  }
};


export default config;
