import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';

export default function Leaderboard({ signer }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, [signer]);

    const loadLeaderboard = async () => {
        if (!signer) {
            setLoading(false);
            return;
        }

        try {
            const contract = await getContract(signer);
            
            const [earners, earnings] = await contract.getLeaderboard();

            const data = earners.map((addr, i) => ({
                address: addr,
                earnings: earnings[i],
                rawEarnings: earnings[i] 
            }));

            
            data.sort((a, b) => {
                if (a.rawEarnings > b.rawEarnings) return -1;
                if (a.rawEarnings < b.rawEarnings) return 1;
                return 0;
            });

            setLeaders(data);
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading leaderboard...</div>;
    if (!signer) return <div className="p-8 text-center text-red-500">Please connect wallet to view leaderboard</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-4">Global Leaderboard</h1>

            {leaders.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl">
                    No rewards have been distributed yet. Be the first to earn!
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-gray-500 font-medium w-16">Rank</th>
                                <th className="px-6 py-4 text-gray-500 font-medium">Contributor</th>
                                <th className="px-6 py-4 text-gray-500 font-medium text-right">Total Earned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leaders.map((item, index) => (
                                <tr key={item.address} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-400">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-blue-600">
                                        {item.address}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">
                                        {ethers.formatEther(item.earnings)} ETH
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
