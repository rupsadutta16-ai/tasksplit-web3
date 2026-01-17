import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getGenesisNFT, getStandardNFT, getContract } from '../utils/contract';
import { formatEth } from '../utils/format';

export default function NFTStatus({ signer, address }) {
    const [hasGenesisNFT, setHasGenesisNFT] = useState(false);
    const [hasStandardNFT, setHasStandardNFT] = useState(false);
    const [totalEarnings, setTotalEarnings] = useState('0');
    const [isEligible, setIsEligible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        if (signer && address) {
            checkNFTStatus();
        }
    }, [signer, address]);

    const checkNFTStatus = async () => {
        try {
            const provider = signer.provider || signer;
            const genesisNFT = await getGenesisNFT(provider);
            const standardNFT = await getStandardNFT(provider);
            const contract = await getContract(provider);

            const hasG = await genesisNFT.isGenesisVerifier(address);
            setHasGenesisNFT(hasG);

            const hasS = await standardNFT.isVerifierNFT(address);
            setHasStandardNFT(hasS);

            const earnings = await contract.globalEarnings(address);
            setTotalEarnings(earnings.toString());

            const eligible = await contract.isEligibleVerifier(address);
            setIsEligible(eligible);
        } catch (err) {
            console.error("Failed to check NFT status:", err);
        } finally {
            setLoading(false);
        }
    };

    const claimNFT = async () => {
        if (!signer) return;
        setClaiming(true);
        try {
            const contract = await getContract(signer);
            const tx = await contract.claimVerifierNFT();
            await tx.wait();
            alert("Standard Verifier NFT claimed successfully!");
            checkNFTStatus();
        } catch (err) {
            console.error("NFT Claim error:", err);
            alert(err.reason || err.message || "Claim failed");
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return (
            <div className="text-xs text-gray-400">Loading...</div>
        );
    }

    return (
        <div className="relative group cursor-pointer">
            <div className={`flex items-center md:gap-2 md:px-3 pl-2 -pr-4 md:py-1 py-0.5 rounded-full border transition-all ${isEligible
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                </svg>
                <div className="flex hidden md:block flex-col">
                    <span className="hidden md:block text-[10px] font-black uppercase leading-tight">
                        {isEligible ? 'Verifier' : 'Contributor'}
                    </span>
                </div>
            </div>

            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform origin-top-right scale-95 group-hover:scale-100">
                <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-4">Verification Registry</h4>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Genesis</div>
                            <div className={`text-xs font-bold ${hasGenesisNFT ? 'text-green-600' : 'text-gray-400'}`}>
                                {hasGenesisNFT ? 'Verified ✓' : 'Inactive'}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Standard</div>
                            <div className={`text-xs font-bold ${hasStandardNFT ? 'text-blue-600' : 'text-gray-400'}`}>
                                {hasStandardNFT ? 'Active ✓' : 'Inactive'}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                        <span className="text-[10px] font-black text-blue-600 uppercase">Platform Earnings</span>
                        <span className="text-sm font-black text-blue-900">{formatEth(totalEarnings)} ETH</span>
                    </div>

                    <div className="pt-2">
                        {isEligible ? (
                            <div className="space-y-3">
                                <div className="text-[10px] font-bold text-green-600 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Registry Authorization Active
                                </div>
                                {isEligible && !hasStandardNFT && !hasGenesisNFT && (
                                    <button
                                        onClick={claimNFT}
                                        disabled={claiming}
                                        className="w-full py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                    >
                                        {claiming ? 'Minting...' : 'Claim Verifier NFT'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-gray-400">
                                    Reach 0.2 ETH to unlock voting rights
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-1000"
                                        style={{ width: `${Math.min((parseFloat(ethers.formatEther(totalEarnings)) / 0.2) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-50">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-tighter">Requirements</p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-[10px] text-gray-600 font-medium">
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            Hold Genesis or Standard NFT
                        </li>
                        <li className="flex items-center gap-2 text-[10px] text-gray-600 font-medium">
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            Earn ≥ 0.2 ETH on platform
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
