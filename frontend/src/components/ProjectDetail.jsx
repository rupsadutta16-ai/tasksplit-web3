import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';
import TaskCard from './TaskCard';
import ContributorPanel from './ContributorPanel';
import { formatEth } from '../utils/format';

export default function ProjectDetail({ signer, userAddress }) {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [phases, setPhases] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [blockchainTime, setBlockchainTime] = useState(0);

    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPoints, setNewTaskPoints] = useState('');
    const [selectedPhase, setSelectedPhase] = useState(0);

    const [showAddPhase, setShowAddPhase] = useState(false);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [isVerifier, setIsVerifier] = useState(false);

    useEffect(() => {
        if (signer) loadProject();
    }, [id, signer]);

    const loadProject = async () => {
        if (!signer) return;
        try {
            const contract = await getContract(signer);
            const provider = signer.provider;
            const block = await provider.getBlock('latest');
            if (block) {
                const newTime = Number(block.timestamp);
                setBlockchainTime(newTime);
                console.log(`[ProjectDetail] Blockchain Time: ${newTime}`);
            }

            const p = await contract.getProject(id);
            console.log(`[ProjectDetail] Project End Time: ${Number(p.endTime || p[4] || 0)}`);

            setProject({
                name: p.name || p[0] || '',
                sponsor: p.sponsor || p[1] || ethers.ZeroAddress,
                contributorPool: (p.contributorPool || p[2] || 0).toString(),
                verifierPool: (p.verifierPool || p[3] || 0).toString(),
                endTime: Number(p.endTime || p[4] || 0),
                phaseCount: Number(p.phaseCount || p[5] || 0),
                taskCount: Number(p.taskCount || p[6] || 0)
            });

            const phaseCount = Number(p.phaseCount || p[5] || 0);
            const loadedPhases = [];
            for (let i = 0; i < phaseCount; i++) {
                const phase = await contract.getPhase(id, i);
                loadedPhases.push({
                    id: i,
                    name: phase[0],
                    taskCount: Number(phase[1]),
                    verifiedTaskCount: Number(phase[2]),
                    unlocked: phase[3]
                });
            }
            setPhases(loadedPhases);

                
            const taskCount = Number(p[6]);
            const loadedTasks = [];
            for (let i = 0; i < taskCount; i++) {
                
                const t = await contract.getTask(id, i, userAddress || ethers.ZeroAddress);
                loadedTasks.push({
                    id: i,
                    phaseId: Number(t[0]),
                    description: t[1],
                    points: Number(t[2]),
                    claimant: t[3],
                    proofUrl: t[4],
                    status: Number(t[5]),
                    voteCount: Number(t[6]),
                    claimDeadline: Number(t[7]),
                    hasVoted: t[8]
                });
            }
            setTasks(loadedTasks);

           
            const isElig = await contract.isEligibleVerifier(userAddress || ethers.ZeroAddress);
            setIsVerifier(isElig);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addTask = async (e) => {
        e.preventDefault();
        try {
            const contract = await getContract(signer);
            const tx = await contract.addTask(id, selectedPhase, newTaskDesc, newTaskPoints);
            await tx.wait();
            alert('Task added successfully!');
            setNewTaskDesc('');
            setNewTaskPoints('');
            setShowAddTask(false);
            loadProject();
        } catch (err) {
            console.error(err);
            alert('Failed to add task: ' + err.message);
        }
    };

    const addPhase = async (e) => {
        e.preventDefault();
        try {
            const contract = await getContract(signer);
            const tx = await contract.addPhase(id, newPhaseName);
            await tx.wait();
            alert('Phase added successfully!');
            setNewPhaseName('');
            setShowAddPhase(false);
            loadProject();
        } catch (err) {
            console.error(err);
            alert('Failed to add phase: ' + err.message);
        }
    };

    if (!signer) return <div className="p-8 text-center text-red-500">Please connect wallet first</div>;
    if (loading) return <div className="p-8 text-center">Loading project...</div>;
    if (!project) return <div className="p-8 text-center">Project not found</div>;

    const isSponsor = userAddress && project.sponsor.toLowerCase() === userAddress.toLowerCase();
    const isEnded = blockchainTime > 0 && project.endTime > 0 && blockchainTime >= project.endTime;

    if (isEnded) {
        console.log(`[ProjectDetail] Project Ended. Time: ${blockchainTime}, EndTime: ${project.endTime}`);
    }
    
    const tasksByPhase = phases.map(phase => ({
        ...phase,
        tasks: tasks.filter(t => t.phaseId === phase.id)
    }));

    const canAddPhase = phases.length < 5;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">← Back to Projects</Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>

                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            by {project.sponsor.slice(0, 6)}...{project.sponsor.slice(-4)}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">Ends {new Date(project.endTime * 1000).toLocaleString()}</div> 
                        {isEnded && (
                            <div className="mt-2 bg-red-100 text-red-700 px-3 py-1 text-center rounded-full text-xs font-medium">
                                Project Ended
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                        <div className="text-sm text-gray-500">Contributor Pool</div>
                        <div className="text-2xl font-bold text-blue-600">{formatEth(project.contributorPool)} ETH</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Verifier Pool</div>
                        <div className="text-2xl font-bold text-purple-600">{formatEth(project.verifierPool)} ETH</div>
                    </div>
                </div>
            </div>

          
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Phase Progress</h2>
                    {isSponsor && !showAddPhase && !isEnded && (
                        <button
                            onClick={() => setShowAddPhase(true)}
                            disabled={!canAddPhase}
                            className={`${canAddPhase ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'} text-white px-4 py-2 rounded-lg text-sm font-medium`}
                        >
                            {canAddPhase ? '+ Add Phase' : 'Max Phases Reached'}
                        </button>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                    {phases.map((phase, idx) => (
                        <div
                            key={phase.id}
                            className={`px-4 py-2 rounded-lg border-2 ${phase.unlocked
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-300 bg-gray-50 text-gray-500'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                {phase.unlocked ? '🔓' : '🔒'}
                                <div>
                                    <div className="font-medium">{phase.name}</div>
                                    <div className="text-xs">
                                        {phase.verifiedTaskCount}/{phase.taskCount} verified
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

               
                {showAddPhase && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                        <h3 className="font-bold text-sm mb-3">Add New Phase</h3>
                        <form onSubmit={addPhase} className="flex gap-2">
                            <input
                                type="text"
                                value={newPhaseName}
                                onChange={e => setNewPhaseName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                                placeholder="e.g., Phase 2: Testing"
                                required
                            />
                            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddPhase(false)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                )}
            </div>

          
            {isSponsor && !showAddTask && !isEnded && (
                <div className="flex flex-col gap-2 mb-6">
                    <button
                        onClick={() => setShowAddTask(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                    >
                        + Add New Task
                    </button>
                    <p className="text-xs text-gray-500 italic">Max 5 tasks per phase. Max 100 points per task.</p>
                </div>
            )}

           
            {showAddTask && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-bold mb-4">Add New Task</h3>
                    <form onSubmit={addTask} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Phase</label>
                            <select
                                value={selectedPhase}
                                onChange={e => setSelectedPhase(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                required
                            >
                                {phases.map(phase => {
                                    const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
                                    const isPhaseFull = phaseTasks.length >= 5;
                                    return (
                                        <option key={phase.id} value={phase.id} disabled={isPhaseFull}>
                                            {phase.name} {!phase.unlocked && '(Locked)'} {isPhaseFull && '(FULL)'}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                            <input
                                type="text"
                                value={newTaskDesc}
                                onChange={e => setNewTaskDesc(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                placeholder="e.g., Design login page mockup"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Points (Pts)</label>
                            <input
                                type="number"
                                value={newTaskPoints}
                                onChange={e => setNewTaskPoints(Math.min(100, e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                placeholder="e.g., 100 (Max 100)"
                                min="1"
                                max="100"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
                                Add Task
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddTask(false)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

          
            <div className="space-y-8">
                {tasksByPhase.map(phase => (
                    <div key={phase.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-xl font-bold text-gray-900">{phase.name}</h2>
                            {phase.unlocked ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                    🔓 Unlocked
                                </span>
                            ) : (
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                    🔒 Locked
                                </span>
                            )}
                            <span className="text-sm text-gray-500">
                                ({phase.verifiedTaskCount}/{phase.taskCount} verified)
                            </span>
                        </div>

                        {phase.tasks.length === 0 ? (
                            <div className="text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
                                No tasks in this phase yet
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {phase.tasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        projectId={id}
                                        userAddress={userAddress}
                                        isSponsor={isSponsor}
                                        isPhaseUnlocked={phase.unlocked}
                                        blockchainTime={blockchainTime}
                                        isEnded={isEnded}
                                        isVerifier={isVerifier}
                                        signer={signer}
                                        refresh={loadProject}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

         
            {userAddress && (
                <div className="mt-8">
                    <ContributorPanel
                        projectId={id}
                        signer={signer}
                        userAddress={userAddress}
                        projectEnded={isEnded}
                        tasks={tasks}
                        isSponsor={isSponsor}
                    />
                </div>
            )}
        </div>
    );
}
