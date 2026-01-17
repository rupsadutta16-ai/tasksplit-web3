import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';
import { formatEth, formatPoints } from '../utils/format';

export default function ContributorPanel({ projectId, userAddress, signer, projectEnded, tasks, isSponsor }) {
    const [stats, setStats] = useState({
        contributorPoints: 0,
        contributorReward: '0',
        verifierPoints: 0,
        verifierReward: '0'
    });
    const [projectTotals, setProjectTotals] = useState({
        contributorPool: '0',
        verifierPool: '0',
        totalVerifiedPoints: 0,
        totalVerifierPoints: 0,
        totalPossiblePoints: 0,
        sponsorRefunded: false
    });
    const [hasClaimed, setHasClaimed] = useState({
        contributor: false,
        verifier: false
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userAddress && projectId !== undefined) {
            loadData();
        }
    }, [userAddress, projectId, signer, tasks]);

    const loadData = async () => {
        try {
            const contract = await getContract(signer);

          
            const cp = await contract.getContributorPoints(projectId, userAddress);
            const cr = await contract.getProjectedContributorReward(projectId, userAddress);
            const vp = await contract.getVerifierPoints(projectId, userAddress);
            const vr = await contract.getProjectedVerifierReward(projectId, userAddress);

           
            try {
                const [cClaimed, vClaimed] = await contract.hasClaimed(projectId, userAddress);
                setHasClaimed({ contributor: cClaimed, verifier: vClaimed });
            } catch (cErr) {
                console.warn("hasClaimed check failed:", cErr);
            }

            try {
                const p = await contract.getProjectDetailed(projectId);
                setProjectTotals({
                    contributorPool: p.contributorPool.toString(),
                    verifierPool: p.verifierPool.toString(),
                    totalVerifiedPoints: Number(p.totalVerifiedPoints),
                    totalVerifierPoints: Number(p.totalVerifierPoints),
                    totalPossiblePoints: Number(p.totalPossiblePoints),
                    sponsorRefunded: p.sponsorRefunded
                });
            } catch (pErr) {
                console.warn("[ContributorPanel] getProjectDetailed failed (old contract?), falling back to mapping:", pErr);
                const pFallback = await contract.projects(projectId);
                setProjectTotals({
                    contributorPool: (pFallback.contributorPool || 0).toString(),
                    verifierPool: (pFallback.verifierPool || 0).toString(),
                    totalVerifiedPoints: Number(pFallback.totalVerifiedPoints || 0),
                    totalVerifierPoints: Number(pFallback.totalVerifierPoints || 0),
                    totalPossiblePoints: Number(pFallback.totalPossiblePoints || 0),
                    sponsorRefunded: !!pFallback.sponsorRefunded
                });
            }

            setStats({
                contributorPoints: Number(cp),
                contributorReward: cr.toString(),
                verifierPoints: Number(vp),
                verifierReward: vr.toString()
            });

        } catch (err) {
            console.error("ContributorPanel loadData global error:", err);
        }
    };

    const claimReward = async (type) => {
        setLoading(true);
        try {
            const contract = await getContract(signer);
            let tx = type === 'contributor'
                ? await contract.claimContributorReward(projectId)
                : await contract.claimVerifierReward(projectId);
            await tx.wait();
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} reward claimed!`);
            loadData();
        } catch (err) {
            console.error(err);
            alert(err.reason || err.message || 'Claim failed');
        } finally {
            setLoading(false);
        }
    };

    const claimRefund = async () => {
        setLoading(true);
        try {
            const contract = await getContract(signer);
            const tx = await contract.claimSponsorRefund(projectId);
            await tx.wait();
            alert('Sponsor refund claimed!');
            loadData();
        } catch (err) {
            console.error(err);
            alert(err.reason || err.message || 'Refund failed');
        } finally {
            setLoading(false);
        }
    };

    const hasAnyContribution = stats.contributorPoints > 0 || stats.verifierPoints > 0;

    const contributors = tasks
        ? [...new Set(tasks.filter(t => t.status >= 2 && t.claimant).map(t => t.claimant.toLowerCase()))]
        : [];

    const earnedPoints = tasks
        ? tasks.filter(t => t.status === 2 || t.status === 3).reduce((acc, t) => acc + Number(t.points), 0)
        : 0;

    const unearnedPoints = Math.max(0, projectTotals.totalPossiblePoints - earnedPoints);

    const potentialRefund = projectTotals.totalPossiblePoints > 0
        ? (BigInt(unearnedPoints) * BigInt(projectTotals.contributorPool)) / BigInt(projectTotals.totalPossiblePoints)
        : 0n;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span>🏆</span> {isSponsor ? 'Sponsor Dashboard' : 'Your Project Rewards'}
                    </h3>
                    <span className="text-xs text-blue-100 font-medium bg-blue-500/30 px-2 py-1 rounded">
                        {projectEnded ? 'Project Ended' : 'Ongoing'}
                    </span>
                </div>

                <div className="p-6">
                    {isSponsor ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={`p-5 rounded-2xl border transition-all ${projectEnded && !projectTotals.sponsorRefunded && unearnedPoints > 0 ? 'bg-orange-50 border-orange-200 ring-4 ring-orange-50' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Unearned ETH Refund</div>
                                        <div className="text-3xl font-black text-orange-900 leading-none">
                                            {formatEth(potentialRefund)}
                                            <span className="text-sm font-bold text-orange-400"> ETH</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                        <div className="text-xs font-black text-gray-900 leading-none">
                                            {projectTotals.sponsorRefunded ? '✅ Refunded' : projectEnded ? '⏳ Awaiting Claim' : 'Locked'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={claimRefund}
                                    disabled={!projectEnded || loading || projectTotals.sponsorRefunded || unearnedPoints === 0}
                                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${projectEnded && !projectTotals.sponsorRefunded && unearnedPoints > 0
                                        ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-200 active:scale-95'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                                        }`}
                                >
                                    {loading ? 'Processing...' : projectTotals.sponsorRefunded ? 'Refund Already Claimed' : projectEnded ? 'Claim Refund' : 'Locked until project ends'}
                                </button>
                            </div>
                            <div className="p-5 rounded-2xl border bg-gray-50 border-gray-100 flex flex-col justify-center">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Unearned Points</div>
                                <div className="text-3xl font-black text-gray-900 leading-none text-center mb-2">
                                    {unearnedPoints} <span className="text-sm font-bold text-gray-400">Pts</span>
                                </div>
                                <p className="text-[10px] text-gray-500 italic text-center">
                                    Funds from tasks that are Open, Claimed (not submitted) or Locked are refunded to you.
                                </p>
                            </div>
                        </div>
                    ) : (
                        !hasAnyContribution ? (
                            <div className="text-center py-4">
                                <p className="text-gray-500 italic">No personal contributions yet.</p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Claim and complete tasks to earn rewards</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-5 rounded-2xl border transition-all ${stats.contributorPoints > 0 || (projectEnded && tasks?.some(t => t.claimant?.toLowerCase() === userAddress?.toLowerCase() && t.status === 2)) ? 'bg-blue-50 border-blue-200 ring-4 ring-blue-50' : 'bg-gray-50 border-gray-100 grayscale'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Contributor Mode</div>
                                            <div className="text-3xl font-black text-blue-900 leading-none">{formatPoints(stats.contributorPoints)} <span className="text-sm font-bold text-blue-400">Pts</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pool Share</div>
                                            <div className="text-xl font-black text-gray-900 leading-none">{formatEth(stats.contributorReward)} <span className="text-xs font-bold text-gray-400">ETH</span></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => claimReward('contributor')}
                                        disabled={!projectEnded || loading || hasClaimed.contributor || (stats.contributorPoints === 0 && !tasks?.some(t => t.claimant?.toLowerCase() === userAddress?.toLowerCase() && t.status === 2))}
                                        className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${projectEnded && !hasClaimed.contributor ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'}`}
                                    >
                                        {loading ? 'Processing...' : hasClaimed.contributor ? 'Already Claimed' : projectEnded ? 'Claim Contributor ETH' : 'Unlocked after project ends'}
                                    </button>
                                </div>

                                <div className={`p-5 rounded-2xl border transition-all ${stats.verifierPoints > 0 ? 'bg-purple-50 border-purple-200 ring-4 ring-purple-50' : 'bg-gray-50 border-gray-100 grayscale'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Verifier Mode</div>
                                            <div className="text-3xl font-black text-purple-900 leading-none">{formatPoints(stats.verifierPoints)} <span className="text-sm font-bold text-purple-400">Pts</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pool Share</div>
                                            <div className="text-xl font-black text-gray-900 leading-none">{formatEth(stats.verifierReward)} <span className="text-xs font-bold text-gray-400">ETH</span></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => claimReward('verifier')}
                                        disabled={!projectEnded || loading || hasClaimed.verifier || stats.verifierPoints === 0}
                                        className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${projectEnded && stats.verifierPoints > 0 && !hasClaimed.verifier ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'}`}
                                    >
                                        {loading ? 'Processing...' : hasClaimed.verifier ? 'Already Claimed' : projectEnded ? 'Claim Verifier ETH' : 'Unlocked after project ends'}
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span>👥</span> Project Contributors
                </h3>

                {contributors.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <p className="text-gray-400 text-sm font-medium italic">No valid contributions yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="pb-3">Contributor</th>
                                    <th className="pb-3 text-right">Points</th>
                                    <th className="pb-3 text-right">Current Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {contributors.map((addr) => {
                                   
                                    const userTasks = tasks.filter(t => t.claimant?.toLowerCase() === addr && (t.status === 3 || (projectEnded && t.status === 2)));
                                    const userPoints = userTasks.reduce((acc, t) => acc + Number(t.points), 0);

                                    const shareEth = projectTotals.totalPossiblePoints > 0
                                        ? (BigInt(userPoints) * BigInt(projectTotals.contributorPool)) / BigInt(projectTotals.totalPossiblePoints)
                                        : 0n;

                                    return (
                                        <tr key={addr} className={`group ${addr === userAddress?.toLowerCase() ? 'bg-blue-50/50' : ''} `}>
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-black text-white group-hover:from-blue-400 group-hover:to-indigo-500 transition-all">
                                                        {addr.slice(2, 4).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 leading-tight">
                                                            {addr === userAddress?.toLowerCase() ? 'You (via Wallet)' : `${addr.slice(0, 6)}...${addr.slice(-4)} `}
                                                        </div>
                                                        {addr === userAddress?.toLowerCase() && (
                                                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Current User</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="text-sm font-black text-gray-900">{userPoints} XP</div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="text-sm font-black text-green-600">~ {formatEth(shareEth)} ETH</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
