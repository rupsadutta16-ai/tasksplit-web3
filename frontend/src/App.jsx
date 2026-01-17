import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContract } from './utils/contract';
import WalletConnect from './components/WalletConnect';
import NFTStatus from './components/NFTStatus';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import Leaderboard from './components/Leaderboard';
import { formatEth } from './utils/format';

function App() {
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [contributorPool, setContributorPool] = useState('');
  const [verifierPool, setVerifierPool] = useState('');
  const [globalEarnings, setGlobalEarnings] = useState('0');

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (signer && address) {
      loadGlobalEarnings();
    }
  }, [signer, address]);

  const loadGlobalEarnings = async () => {
    try {
      if (signer && signer.provider) {
        const network = await signer.provider.getNetwork();
        
        if (network.chainId.toString() !== "31337") {
          return; 
        }
      }
      const contract = await getContract(signer);
      const earnings = await contract.globalEarnings(address);
      setGlobalEarnings(earnings.toString());
    } catch (err) {
      console.error("Failed to load global earnings:", err);
      
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!signer) return alert("Connect wallet first");

    try {
      setCreating(true);
      const contract = await getContract(signer);
      
      const phaseNames = ["Phase 1"];

      
      const contributorPoolWei = ethers.parseEther(contributorPool);
      const verifierPoolWei = ethers.parseEther(verifierPool);
      const totalWei = contributorPoolWei + verifierPoolWei;

      console.log(`Creating project with Contributor: ${contributorPool} ETH, Verifier: ${verifierPool} ETH`);

      
      const tx = await contract.createProject(
        newName,
        newDuration,
        phaseNames,
        contributorPoolWei,
        verifierPoolWei,
        { value: totalWei }
      );
      await tx.wait();
      alert("Project created successfully!");
      setNewName('');
      setNewDuration('');
      setContributorPool('');
      setVerifierPool('');
      window.dispatchEvent(new Event('projectCreated'));
    } catch (err) {
      console.error(err);
      alert("Failed to create project: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">Ts</div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                TaskSplit
              </span>
            </Link>

            
            <div className="flex items-center gap-2 md:gap-6">
              
              <nav className="hidden md:flex gap-6 items-center text-sm font-medium text-gray-600 mr-4">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `transition-colors ${isActive ? "text-blue-600 font-semibold" : "hover:text-blue-600"
                    }`
                  }
                >
                  Projects
                </NavLink>

                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) =>
                    `transition-colors ${isActive ? "text-blue-600 font-semibold" : "hover:text-blue-600"
                    }`
                  }
                >
                  Leaderboard
                </NavLink>
              </nav>

            
              <div className="flex items-center gap-2 md:gap-4">
                {signer && (
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 flex items-center gap-1">
                    <span className="text-xs font-bold whitespace-nowrap">{formatEth(globalEarnings)} ETH</span>
                  </div>
                )}
                {signer && <NFTStatus signer={signer} address={address} />}

                <div className="hidden md:block">
                  <WalletConnect setSigner={setSigner} setAddress={setAddress} />
                </div>
              </div>

             
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors ml-2"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>

        
          {isMenuOpen && (
            <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-4 animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col gap-4">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-blue-600 py-2 border-b border-gray-50">Projects</Link>
                <Link to="/leaderboard" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-blue-600 py-2 border-b border-gray-50">Leaderboard</Link>
                <div className="pt-2">
                  <WalletConnect setSigner={setSigner} setAddress={setAddress} />
                </div>
              </nav>
            </div>
          )}
        </header>

        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Explore Projects</h1>
                    <p className="text-gray-500 mt-1">Find bounties, contribute work, and earn rewards.</p>
                  </div>

                  
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hidden md:block">
                    <h3 className="font-bold text-sm mb-2">Launch New Project</h3>
                    <form onSubmit={createProject} className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Project Name"
                        className="border rounded px-2 py-1 text-sm col-span-2"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Duration (days)"
                        className="border rounded px-2 py-1 text-sm col-span-2"
                        value={newDuration}
                        onChange={e => setNewDuration(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Contributor Pool (ETH)"
                        className="border rounded px-2 py-1 text-sm"
                        value={contributorPool}
                        onChange={e => setContributorPool(e.target.value)}
                        step="0.001"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Verifier Pool (ETH)"
                        className="border rounded px-2 py-1 text-sm"
                        value={verifierPool}
                        onChange={e => setVerifierPool(e.target.value)}
                        step="0.001"
                        required
                      />
                      <button
                        disabled={creating || !signer}
                        className="bg-black text-white px-3 py-1 rounded text-sm hover:opacity-80 disabled:opacity-50 col-span-2"
                      >
                        {creating ? '...' : 'Create'}
                      </button>
                    </form>
                  </div>
                </div>
                <ProjectList signer={signer} />
              </>
            } />

            <Route path="/project/:id" element={<ProjectDetail signer={signer} userAddress={address} />} />
            <Route path="/leaderboard" element={<Leaderboard signer={signer} />} />
          </Routes>
        </main>
      </div>
    </Router >
  );
}

export default App;
