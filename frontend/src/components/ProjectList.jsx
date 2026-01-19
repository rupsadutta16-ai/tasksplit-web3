import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContract, EXPECTED_CHAIN_ID } from '../utils/contract';
import { formatEth } from '../utils/format';

export default function ProjectList({ signer }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blockchainTime, setBlockchainTime] = useState(0);

    useEffect(() => {
        loadProjects();
        const handler = () => loadProjects();
        window.addEventListener('projectCreated', handler);
        return () => window.removeEventListener('projectCreated', handler);
    }, [signer]);

    const loadProjects = async () => {
        setError(null);
        try {
            let provider;


            if (signer && signer.provider) {
                provider = signer.provider;
            } else if (window.ethereum) {
                provider = new ethers.BrowserProvider(window.ethereum);
            } else {
                provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            }

            if (!provider) {
                setError("Unable to connect. Please ensure MetaMask is installed.");
                return;
            }


            try {
                const network = await provider.getNetwork();

                if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
                    setError(`Wrong Network. Please switch to Chain ID: ${EXPECTED_CHAIN_ID} in MetaMask.`);
                    return;
                }
            } catch (networkErr) {
                console.error("Network check failed:", networkErr);
                setError("Unable to verify network. Please ensure MetaMask is correctly configured.");
                return;
            }


            const contract = await getContract(signer || provider);


            let count;
            try {
                const block = await provider.getBlock('latest');
                if (block) setBlockchainTime(Number(block.timestamp));
                count = await contract.getProjectCounter();
            } catch (e) {
                console.warn("Could not fetch project counter. Is contract deployed? " + e.message);
                setError("Failed to load projects. Ensure the contract is deployed to the current network.");
                return;
            }

            console.log("Project count:", count.toString());
            const loadedProjects = [];


            for (let i = 1; i < Number(count); i++) {
                try {

                    const p = await contract.getProject(i);
                    loadedProjects.push({
                        id: i,
                        name: p.name || p[0] || '',
                        sponsor: p.sponsor || p[1] || ethers.ZeroAddress,
                        contributorPool: (p.contributorPool || p[2] || 0).toString(),
                        verifierPool: (p.verifierPool || p[3] || 0).toString(),
                        endTime: p.endTime || p[4] || 0n,
                        phaseCount: (p.phaseCount || p[5] || 0).toString(),
                        taskCount: (p.taskCount || p[6] || 0).toString()
                    });
                } catch (e) {
                    console.error(`Failed to load project ${i}`, e);
                }
            }
            setProjects(loadedProjects);
        } catch (err) {
            console.error("Critical error loading projects:", err);
            setError("Critical error loading projects.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-8">Loading projects...</div>;

    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 rounded-xl border border-red-200 text-red-700">
                <p className="font-bold">Unable to load projects</p>
                <p className="text-sm mt-2">{error}</p>
                <p className="text-xs mt-2 text-red-500">Ensure you are connected to the correct network.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
                <Link to={`/project/${p.id}`} key={p.id} className="block group">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                                <p className="text-sm text-gray-500 font-mono mt-1">
                                    by {p.sponsor.slice(0, 6)}...{p.sponsor.slice(-4)}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">{formatEth(p.contributorPool)} ETH</div>
                                <div className="text-xs text-gray-500">Contributor Pool</div>
                                <div className="text-sm font-semibold text-purple-600 mt-1">{formatEth(p.verifierPool)} ETH</div>
                                <div className="text-xs text-gray-500">Verifier Pool</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{p.phaseCount}</div>
                                <div className="text-xs text-gray-500">Phases</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{p.taskCount}</div>
                                <div className="text-xs text-gray-500">Tasks</div>
                            </div>
                            <div>
                                {blockchainTime > 0 && Number(p.endTime) > 0 && blockchainTime < Number(p.endTime) ? (
                                    <>
                                        <div className="text-sm font-medium text-gray-900">
                                            {new Date(Number(p.endTime) * 1000).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-500">Ends</div>
                                    </>
                                ) : blockchainTime > 0 ? (
                                    <div className="text-sm border rounded-lg text-center text-red-500 bg-red-500/10 mt-2">Ended</div>
                                ) : (
                                    <div className="text-xs text-gray-400">Loading status...</div>
                                )}
                            </div>


                        </div>

                        <div className="bg-blue-50 text-blue-600 text-center py-2 rounded-lg mt-4 font-medium">
                            View Details →
                        </div>
                    </div>
                </Link>
            ))}

            {projects.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    No projects found. Create one to get started!
                </div>
            )}
        </div>
    );
}
