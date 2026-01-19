import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { EXPECTED_CHAIN_ID } from "../utils/contract";

const ARB_SEPOLIA = {
  chainId: "0x66eee", // 421614
  chainName: "Arbitrum Sepolia",
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorerUrls: ["https://sepolia.arbiscan.io"],
};

const LOCALHOST = {
  chainId: "0x7a69", // 31337
  chainName: "Hardhat Localhost",
  rpcUrls: ["http://127.0.0.1:8545"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
};

export default function WalletConnect({ setSigner, setAddress }) {
  const [connectedAddr, setConnectedAddr] = useState("");
  const [chainId, setChainId] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        try {
          const targetChainId = "0x" + EXPECTED_CHAIN_ID.toString(16);
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainId }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            const config = EXPECTED_CHAIN_ID === 31337 ? LOCALHOST : ARB_SEPOLIA;
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [config],
            });
          } else {
            throw switchErr;
          }
        }
      }

      const finalProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await finalProvider.getSigner();
      const address = await signer.getAddress();
      const finalNetwork = await finalProvider.getNetwork();

      setSigner(signer);
      setAddress(address);
      setConnectedAddr(address);
      setChainId(Number(finalNetwork.chainId));
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const autoConnect = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length === 0) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        const targetChainId = "0x" + EXPECTED_CHAIN_ID.toString(16);
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        });
      }

      const refreshedProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await refreshedProvider.getSigner();
      const address = await signer.getAddress();
      const finalNetwork = await refreshedProvider.getNetwork();

      setSigner(signer);
      setAddress(address);
      setConnectedAddr(address);
      setChainId(Number(finalNetwork.chainId));
    } catch (err) {
      console.error("Auto connect failed:", err);
    }
  };

  useEffect(() => {
    autoConnect();

    if (!window.ethereum) return;

    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());

    return () => {
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      {connectedAddr ? (
        <div className="flex flex-col items-end">
          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
            {connectedAddr.slice(0, 6)}...{connectedAddr.slice(-4)}
          </span>
          <span className="text-xs text-gray-500">
            Chain ID: {chainId}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={connectWallet}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}
