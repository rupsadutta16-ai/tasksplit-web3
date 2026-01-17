import { useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';

export default function TaskCard(props) {
    const {
        task,
        projectId,
        userAddress,
        isSponsor,
        isPhaseUnlocked,
        blockchainTime,
        isEnded,
        isVerifier,
        refresh,
        signer
    } = props;

    const [loading, setLoading] = useState(false);
    const [proofUrl, setProofUrl] = useState('');

    
    const status = Number(task.status);
    const phaseId = Number(task.phaseId);
    const voteCount = Number(task.voteCount);
    const claimDeadline = Number(task.claimDeadline);

    const STATUS_LABELS = ['Open', 'Claimed', 'Submitted', 'Verified', 'Rejected'];
    const STATUS_COLORS = [
        'bg-green-100 text-green-700',
        'bg-yellow-100 text-yellow-700',
        'bg-blue-100 text-blue-700',
        'bg-green-500 text-white',
        'bg-red-100 text-red-700'
    ];

    const handleAction = async (actionName) => {
        if (!signer) return alert('Connect wallet first');
        if (isEnded) return alert('Project has ended. No further actions allowed.');
        setLoading(true);

        try {
            const contract = await getContract(signer);
            let tx;

            switch (actionName) {
                case 'claim':
                    if (status === 1 && deadlinePassed) {
                        
                        const cancelTx = await contract.cancelTask(projectId, task.id);
                        await cancelTx.wait();
                    }
                    tx = await contract.claimTask(projectId, task.id);
                    break;

                case 'submit':
                    if (!proofUrl) throw new Error('Proof URL required');
                    tx = await contract.submitTask(projectId, task.id, proofUrl);
                    break;

                case 'vote_approve':
                    tx = await contract.stakeAndVote(
                        projectId,
                        task.id,
                        true,
                        { value: ethers.parseEther("0.02") }
                    );
                    break;

                case 'vote_reject':
                    tx = await contract.stakeAndVote(
                        projectId,
                        task.id,
                        false,
                        { value: ethers.parseEther("0.02") }
                    );
                    break;

                case 'cancel':
                    tx = await contract.cancelTask(projectId, task.id);
                    break;

                default:
                    throw new Error('Unknown action');
            }

            await tx.wait();
            refresh();
            setProofUrl('');
        } catch (err) {
            console.error(err);
            alert(err.reason || err.message || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    const effectiveNow = blockchainTime || Math.floor(Date.now() / 1000);

    const isClaimant =
        userAddress &&
        task.claimant &&
        task.claimant.toLowerCase() === userAddress.toLowerCase();

    const deadlinePassed =
        claimDeadline > 0 && effectiveNow > claimDeadline;

    return (
        <div className={`border rounded-lg p-4 bg-white shadow-sm transition-all ${status === 3 ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
            
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status === 1 && deadlinePassed ? STATUS_COLORS[0] : (STATUS_COLORS[status] || 'bg-gray-100')}`}>
                            {(status === 1 && deadlinePassed) ? 'Open' : (STATUS_LABELS[status] || 'Unknown')}
                        </span>
                        <span className="text-xs text-gray-500">
                            Phase {phaseId + 1}
                        </span>
                    </div>
                    <h4 className="font-medium mt-2 text-lg">
                        {task.description}
                    </h4>
                </div>

                <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">
                        {task.points} Pts
                    </div>
                    {voteCount > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                            {voteCount} votes
                        </div>
                    )}
                </div>
            </div>

           
            <div className="text-sm text-gray-600 space-y-1 mb-4">
                {task.claimant && task.claimant !== ethers.ZeroAddress && (
                    <div>
                        Claimant: {task.claimant.slice(0, 6)}...
                        {task.claimant.slice(-4)}
                    </div>
                )}

                {status === 1 && claimDeadline > 0 && (
                    <div className={deadlinePassed ? 'text-red-600 font-bold' : 'text-orange-600'}>
                        {deadlinePassed
                            ? '⚠ Task was automatically unclaimed'
                            : `Task will be unclaimed automatically on: ${new Date(claimDeadline * 1000).toLocaleString()}`
                        }
                    </div>
                )}

                {task.proofUrl && (
                    <div className="flex items-center gap-2">
                        Proof:{' '}
                        <a
                            href={task.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                            View submission 🔗
                        </a>
                    </div>
                )}
            </div>

            
            <div className="mt-4 pt-4 border-t border-gray-100">
                {isEnded ? (
                    <div className="text-center py-2 bg-gray-50 rounded-lg text-gray-500 font-medium text-sm border border-gray-200">
                        🏁 Project Ended
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        
                        {(status === 0 || (status === 1 && deadlinePassed)) && (
                            <div className="w-full">
                                {!isSponsor ? (
                                    isPhaseUnlocked ? (
                                        <button
                                            onClick={() => handleAction('claim')}
                                            disabled={loading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-all"
                                        >
                                            {loading ? 'Processing...' : (status === 1 && deadlinePassed ? '✋ Claim Task' : '✋ Claim Task')}
                                        </button>
                                    ) : (
                                        <div className="text-center py-2.5 bg-gray-50 text-gray-400 rounded-lg text-sm border border-dashed border-gray-300">
                                            🔒 Phase Locked
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium italic">
                                        Sponsor View
                                    </div>
                                )}
                            </div>
                        )}

                        
                        {status === 1 && !deadlinePassed && (
                            <div className="w-full flex flex-col gap-2">
                                {isClaimant ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Enter proof URL (e.g. GitHub, Loom)"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={proofUrl}
                                            onChange={e => setProofUrl(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction('submit')}
                                                disabled={loading || !proofUrl}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold"
                                            >
                                                Submit Work
                                            </button>
                                            <button
                                                onClick={() => handleAction('cancel')}
                                                disabled={loading}
                                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    deadlinePassed ? (
                                        <button
                                            onClick={() => handleAction('cancel')}
                                            disabled={loading}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold border border-red-100"
                                        >
                                            ♻ Reset Task (Deadline Passed)
                                        </button>
                                    ) : (
                                        <div className="text-center py-2 bg-gray-50 text-gray-500 rounded-lg text-sm italic">
                                            Work in progress...
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                            
                        {status === 2 && (
                            <div className="w-full space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                                        <span>Voting Progress</span>
                                        <span>{voteCount}/3 Votes</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                                        <div
                                            className="bg-blue-500 h-full transition-all duration-500"
                                            style={{ width: `${(voteCount / 3) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {!isClaimant && !isSponsor && !task.hasVoted && (
                                    isVerifier ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction('vote_approve')}
                                                disabled={loading}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm"
                                            >
                                                Approve (Stake 0.02)
                                            </button>
                                            <button
                                                onClick={() => handleAction('vote_reject')}
                                                disabled={loading}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm"
                                            >
                                                Reject (Stake 0.02)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-2 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-dashed border-gray-200">
                                            🛡️ Verifier Access Required
                                        </div>
                                    )
                                )}

                                {task.hasVoted && (
                                    <div className="text-center py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-bold border border-green-100">
                                        ✅ You have voted
                                    </div>
                                )}

                                {isClaimant && (
                                    <div className="text-center py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm italic">
                                        Waiting for verifiers...
                                    </div>
                                )}
                            </div>
                        )}

                       
                        {status === 3 && (
                            <div className="text-center py-2.5 bg-green-500 rounded-lg text-white font-bold text-sm uppercase tracking-wider">
                                ⭐ Task Verified
                            </div>
                        )}

                       
                        {status === 4 && (
                            <div className="text-center py-2.5 bg-red-100 rounded-lg text-red-700 font-bold text-sm uppercase">
                                ❌ Task Rejected
                            </div>
                        )}
                    </div>
                )}
            </div>

            {loading && (
                <div className="text-xs text-gray-500 mt-3 text-center animate-pulse font-medium">
                    Processing transaction...
                </div>
            )}
        </div>
    );
}
