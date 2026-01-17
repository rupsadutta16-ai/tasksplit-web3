// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GenesisVerifierNFT.sol";
import "./StandardVerifierNFT.sol";

/**
 * @title TaskSplit V2
 * @notice Phase-based task system with verifier voting and dual reward pools
 */
contract TaskSplitV2 is ReentrancyGuard {
    
    // Structs 
    
    enum TaskStatus { Open, Claimed, Submitted, Verified, Rejected }
    
    struct Phase {
        string name;
        uint256[] taskIds;          // Task IDs belonging to this phase
        uint256 verifiedTaskCount;   // Number of verified tasks in this phase
        bool unlocked;               // Whether this phase is accessible
    }
    
    struct Vote {
        address verifier;
        bool approved;
        uint256 stakeAmount;
    }
    
    struct Task {
        uint256 phaseId;
        string description;
        uint256 points;              // Points (Pts) awarded for completion
        address claimant;
        string proofUrl;
        uint256 submissionTime;
        TaskStatus status;
        uint256 claimDeadline;       // 2-day deadline for submission
        Vote[] votes;
        mapping(address => bool) hasVoted;
        bool votingFinalized;
    }
    
    struct Project {
        string name;
        address sponsor;
        uint256 contributorPool;     // ETH pool for contributors
        uint256 verifierPool;         // ETH pool for verifiers
        uint256 endTime;
        Phase[] phases;
        Task[] tasks;
        mapping(address => uint256) contributorPoints;  // Contributor Pts earned
        mapping(address => uint256) verifierPoints;     // Verifier Pts earned
        mapping(address => bool) contributorClaimed;
        mapping(address => bool) verifierClaimed;
        uint256 totalVerifiedPoints;  // Sum of all verified task points
        uint256 totalVerifierPoints;  // Sum of all verifier points
        uint256 totalPossiblePoints;  // Sum of points for all tasks
        bool sponsorRefunded;         // Whether refund has been claimed
        bool exists;
    }
    
    struct VerifierInfo {
        uint256 totalEarned;      // Total ETH earned across platform
        uint256 correctVotes;
        uint256 totalVotes;
    }
    
    // State Variables
    
    uint256 private projectCounter;
    mapping(uint256 => Project) public projects;
    mapping(address => VerifierInfo) public verifierInfo;
    mapping(address => uint256) public globalEarnings;
    address[] public rewardEarners;
    mapping(address => bool) private isRewardEarner;
    
    GenesisVerifierNFT public genesisNFT;
    StandardVerifierNFT public standardNFT; // NEW: Standard NFT contract
    
    uint256 public constant VERIFIER_ELIGIBILITY_THRESHOLD = 0.2 ether;
    uint256 public constant VERIFIER_STAKE = 0.02 ether;
    
    // Hardcoded verifiers
    address[3] public hardcodedVerifiers = [
        0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
        0x90F79bf6EB2c4f870365E785982E1f101E93b906
    ];
    
    // Events
    
    event ProjectCreated(uint256 indexed projectId, string name, address indexed sponsor, uint256 contributorPool, uint256 verifierPool, uint256 phaseCount);
    event PhaseUnlocked(uint256 indexed projectId, uint256 phaseId);
    event TaskAdded(uint256 indexed projectId, uint256 indexed taskId, uint256 phaseId, string description,uint256 points);
    event TaskClaimed(uint256 indexed projectId, uint256 indexed taskId, address indexed claimant);
    event TaskSubmitted(uint256 indexed projectId, uint256 indexed taskId, address indexed contributor, string proofUrl);
    event TaskVoted(uint256 indexed projectId, uint256 indexed taskId, address indexed verifier, bool approved);
    event TaskVerified(uint256 indexed projectId, uint256 indexed taskId, address indexed contributor, uint256 points);
    event TaskRejected(uint256 indexed projectId, uint256 indexed taskId);
    event PhaseAdded(uint256 indexed projectId, uint256 phaseId, string name);
    event ContributorRewardClaimed(uint256 indexed projectId, address indexed contributor, uint256 amount, uint256 points);
    event VerifierRewardClaimed(uint256 indexed projectId, address indexed verifier, uint256 amount, uint256 points);
    event VerifierNFTClaimed(address indexed account);
    
    // Modifiers
    
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].exists, "Project does not exist");
        _;
    }
    
    modifier onlySponsor(uint256 projectId) {
        require(projects[projectId].sponsor == msg.sender, "Only sponsor can call");
        _;
    }
    
    modifier taskExists(uint256 projectId, uint256 taskId) {
        require(taskId < projects[projectId].tasks.length, "Task does not exist");
        _;
    }
    
    // Constructor
    
    constructor(address _genesisNFT, address _standardNFT) {
        genesisNFT = GenesisVerifierNFT(_genesisNFT);
        standardNFT = StandardVerifierNFT(_standardNFT);
        projectCounter = 1; // Start from 1 for clearer IDs
    }
    
    // Core Functions
    
    /**
     * @notice Create a new project with phases and custom pool allocations
     * @param name Project name
     * @param durationDays Project duration in days
     * @param phaseNames Array of phase names
     * @param contributorPoolAmount Amount of ETH for contributor pool
     * @param verifierPoolAmount Amount of ETH for verifier pool
     */
    function createProject(
        string calldata name,
        uint256 durationDays,
        string[] calldata phaseNames,
        uint256 contributorPoolAmount,
        uint256 verifierPoolAmount
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must fund project");
        require(msg.value == contributorPoolAmount + verifierPoolAmount, "Pool amounts must equal msg.value");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(phaseNames.length > 0 && phaseNames.length <= 5, "Phase count must be 1-5");
        require(durationDays > 0, "Duration must be positive");
        require(contributorPoolAmount > 0, "Contributor pool must be positive");
        require(verifierPoolAmount > 0, "Verifier pool must be positive");
        
        uint256 projectId = projectCounter++;
        Project storage project = projects[projectId];
        
        project.name = name;
        project.sponsor = msg.sender;
        project.contributorPool = contributorPoolAmount;
        project.verifierPool = verifierPoolAmount;
        project.endTime = block.timestamp + (durationDays * 1 days);
        project.exists = true;
        
      
        for (uint256 i = 0; i < phaseNames.length; i++) {
            project.phases.push();
            Phase storage phase = project.phases[project.phases.length - 1];
            phase.name = phaseNames[i];
            phase.unlocked = (i == 0); // Only first phase unlocked initially
        }
        
        emit ProjectCreated(projectId, name, msg.sender, contributorPoolAmount, verifierPoolAmount, phaseNames.length);
        return projectId;
    }

    /**
     * @notice Add a new phase to an existing project
     * @param projectId Project ID
     * @param phaseName Name of the new phase
     */
    function addPhase(uint256 projectId, string calldata phaseName) external projectExists(projectId) onlySponsor(projectId) {
        Project storage project = projects[projectId];
        require(project.phases.length < 5, "Max 5 phases reached");
        require(bytes(phaseName).length > 0, "Phase name cannot be empty");
        
        project.phases.push();
        Phase storage newPhase = project.phases[project.phases.length - 1];
        newPhase.name = phaseName;
        newPhase.unlocked = false;
        
        emit PhaseAdded(projectId, project.phases.length - 1, phaseName);
    }


    
    /**
     * @notice Add a task to a specific phase
     */
    function addTask(
        uint256 projectId,
        uint256 phaseId,
        string calldata description,
        uint256 points
    ) external projectExists(projectId) onlySponsor(projectId) returns (uint256) {
        Project storage project = projects[projectId];
        require(phaseId < project.phases.length, "Phase does not exist");
        require(bytes(description).length > 0, "Description empty");
        require(points > 0 && points <= 100, "Points must be 1-100");
        require(project.phases[phaseId].taskIds.length < 5, "Max 5 tasks per phase");
        
        uint256 taskId = project.tasks.length;
        project.tasks.push();
        Task storage task = project.tasks[taskId];
        
        task.phaseId = phaseId;
        task.description = description;
        task.points = points;
        task.status = TaskStatus.Open;
        
        project.phases[phaseId].taskIds.push(taskId);
        project.totalPossiblePoints += points;
        
        emit TaskAdded(projectId, taskId, phaseId, description, points);
        return taskId;
    }
    
    /**
     * @notice Claim a task (only if phase is unlocked)
     */
    function claimTask(uint256 projectId, uint256 taskId) external {
        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");
        require(taskId < project.tasks.length, "Task does not exist"); // Added taskExists check
        require(msg.sender != project.sponsor, "Sponsor cannot claim tasks");
        
        Task storage task = project.tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not available");
        require(project.phases[task.phaseId].unlocked, "Phase is locked");
        require(block.timestamp < project.endTime, "Project ended"); // Kept this check
        
        task.claimant = msg.sender;
        task.status = TaskStatus.Claimed;
        task.claimDeadline = block.timestamp + 2 days;  // 2-day deadline
        
        emit TaskClaimed(projectId, taskId, msg.sender);
    }
    
    /**
     * @notice Cancel a claimed task (by claimant or if deadline passed)
     */
    function cancelTask(uint256 projectId, uint256 taskId) external {
        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");
        
        Task storage task = project.tasks[taskId];
        require(task.status == TaskStatus.Claimed, "Task not claimed");
        
        
        require(
            msg.sender == task.claimant || block.timestamp > task.claimDeadline,
            "Not authorized or deadline not passed"
        );
        
        task.claimant = address(0);
        task.status = TaskStatus.Open;
        task.claimDeadline = 0;
        
        emit TaskClaimed(projectId, taskId, address(0));  // Emit with zero address to indicate cancellation
    }
    
    /**
     * @notice Submit completed task work
     */
    function submitTask(uint256 projectId, uint256 taskId, string calldata proofUrl)
        external
        projectExists(projectId)
        taskExists(projectId, taskId)
    {
        Project storage project = projects[projectId];
        Task storage task = project.tasks[taskId];
        
        require(task.claimant == msg.sender, "Not task claimant");
        require(task.status == TaskStatus.Claimed, "Task not in claimed status");
        require(bytes(proofUrl).length > 0, "Proof URL required");
        
        task.status = TaskStatus.Submitted;
        task.proofUrl = proofUrl;
        task.submissionTime = block.timestamp;
        
        emit TaskSubmitted(projectId, taskId, msg.sender, proofUrl);
    }
    
    /**
     * @notice Verifier stakes and votes on task submission
     */
    function stakeAndVote(uint256 projectId, uint256 taskId, bool approved)
        external
        payable
        projectExists(projectId)
        taskExists(projectId, taskId)
        nonReentrant
    {
        require(isEligibleVerifier(msg.sender), "Not eligible verifier");
        require(msg.value == VERIFIER_STAKE, "Incorrect stake amount");
        
        Project storage project = projects[projectId];
        Task storage task = project.tasks[taskId];
        
        require(task.status == TaskStatus.Submitted, "Task not submitted");
        require(!task.hasVoted[msg.sender], "Already voted");
        require(msg.sender != task.claimant, "Cannot vote on own task");
        require(block.timestamp < project.endTime, "Project ended");
        
        task.votes.push(Vote({
            verifier: msg.sender,
            approved: approved,
            stakeAmount: msg.value
        }));
        task.hasVoted[msg.sender] = true;
        
        verifierInfo[msg.sender].totalVotes++;
        
        emit TaskVoted(projectId, taskId, msg.sender, approved);

        // Auto-finalize if 3 votes reached
        if (task.votes.length >= 3) {
            _finalizeTaskVoting(projectId, taskId);
        }
    }
    
    /**
     * @notice Finalize voting and verify/reject task
     */
    function finalizeTaskVoting(uint256 projectId, uint256 taskId)
        external
        projectExists(projectId)
        taskExists(projectId, taskId)
        nonReentrant
    {
        _finalizeTaskVoting(projectId, taskId);
    }

    function _finalizeTaskVoting(uint256 projectId, uint256 taskId) internal {
        Project storage project = projects[projectId];
        Task storage task = project.tasks[taskId];
        
        require(task.status == TaskStatus.Submitted, "Task not submitted");
        require(!task.votingFinalized, "Already finalized");

        uint256 approveCount = 0;
        uint256 rejectCount = 0;
        
        for (uint256 i = 0; i < task.votes.length; i++) {
            if (task.votes[i].approved) {
                approveCount++;
            } else {
                rejectCount++;
            }
        }
        
        bool approved = approveCount > rejectCount;
        task.votingFinalized = true;
        
        if (approved) {
            _verifyTask(projectId, taskId, project, task);
             
            // Reward correct verifiers
            for (uint256 i = 0; i < task.votes.length; i++) {
                if (task.votes[i].approved) {
                    address verifier = task.votes[i].verifier;
                    project.verifierPoints[verifier] += 1;
                    project.totalVerifierPoints += 1;
                    verifierInfo[verifier].correctVotes++;
                    
                    // Return stake
                    (bool success, ) = verifier.call{value: task.votes[i].stakeAmount}("");
                    require(success, "Stake return failed");
                }
            }
        } else {
            // Task Rejected - Reset to Open
            task.status = TaskStatus.Open;
            task.claimant = address(0);
            task.proofUrl = "";
            task.claimDeadline = 0;
            task.votingFinalized = false;
            
            // Reset voters for this task
            for (uint256 i = 0; i < task.votes.length; i++) {
                task.hasVoted[task.votes[i].verifier] = false;
            }
            delete task.votes;

            emit TaskRejected(projectId, taskId);
        }
    }
    
    /**
     * @notice Auto-verify submitted tasks with no votes after project deadline
     */
    function autoVerifyUnvotedTasks(uint256 projectId)
        external
        projectExists(projectId)
    {
        Project storage project = projects[projectId];
        require(block.timestamp >= project.endTime, "Project not ended");
        
        for (uint256 i = 0; i < project.tasks.length; i++) {
            Task storage task = project.tasks[i];
            if (task.status == TaskStatus.Submitted && task.votes.length == 0) {
                _verifyTask(projectId, i, project, task);
            }
        }
    }
    
    /**
     * @notice Internal function to verify task
     */
    function _verifyTask(
        uint256 projectId,
        uint256 taskId,
        Project storage project,
        Task storage task
    ) private {
        task.status = TaskStatus.Verified;
        project.contributorPoints[task.claimant] += task.points;
        project.totalVerifiedPoints += task.points;
        
        // Check if phase completion unlocks next phase
        Phase storage phase = project.phases[task.phaseId];
        phase.verifiedTaskCount++;
        
        if (phase.verifiedTaskCount == phase.taskIds.length && task.phaseId + 1 < project.phases.length) {
            project.phases[task.phaseId + 1].unlocked = true;
            emit PhaseUnlocked(projectId, task.phaseId + 1);
        }
        
        emit TaskVerified(projectId, taskId, task.claimant, task.points);
    }
    
    /**
     * @notice Claim contributor reward after project ends
     */
    function claimContributorReward(uint256 projectId)
        external
        projectExists(projectId)
        nonReentrant
    {
        Project storage project = projects[projectId];
        require(block.timestamp >= project.endTime, "Project not ended");
        require(!project.contributorClaimed[msg.sender], "Already claimed");
        
        // REFINED: Auto-verify ALL submitted tasks for the claimant
        for (uint256 i = 0; i < project.tasks.length; i++) {
            Task storage task = project.tasks[i];
            if (task.claimant == msg.sender && task.status == TaskStatus.Submitted) {
                _verifyTask(projectId, i, project, task);
            }
        }

        uint256 points = project.contributorPoints[msg.sender];
        require(points > 0, "No points earned");
        
        // Use totalPossiblePoints for denominator to allow sponsor refunds of unearned ETH
        uint256 reward = (points * project.contributorPool) / project.totalPossiblePoints;
        project.contributorClaimed[msg.sender] = true;
        
        globalEarnings[msg.sender] += reward;
        verifierInfo[msg.sender].totalEarned += reward; // Track for eligibility
        if (!isRewardEarner[msg.sender]) {
            rewardEarners.push(msg.sender);
            isRewardEarner[msg.sender] = true;
        }
        
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer failed");
        
        emit ContributorRewardClaimed(projectId, msg.sender, reward, points);
    }
    
    /**
     * @notice Claim verifier reward after project ends
     */
    function claimVerifierReward(uint256 projectId)
        external
        projectExists(projectId)
        nonReentrant
    {
        Project storage project = projects[projectId];
        require(block.timestamp >= project.endTime, "Project not ended");
        require(!project.verifierClaimed[msg.sender], "Already claimed");
        
        uint256 points = project.verifierPoints[msg.sender];
        require(points > 0, "No verifier points");
        
        // Verifier pool is fully shared among active verifiers (no sponsor refund for verifier pool)
        uint256 reward = (points * project.verifierPool) / project.totalVerifierPoints;
        project.verifierClaimed[msg.sender] = true;
        
        globalEarnings[msg.sender] += reward;
        verifierInfo[msg.sender].totalEarned += reward;
        if (!isRewardEarner[msg.sender]) {
            rewardEarners.push(msg.sender);
            isRewardEarner[msg.sender] = true;
        }
        
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer failed");
        
        emit VerifierRewardClaimed(projectId, msg.sender, reward, points);
    }

    /**
     * @notice Sponsor claims back ETH from unearned contributor points (Open/Rejected/Locked tasks)
     */
    function claimSponsorRefund(uint256 projectId) 
        external 
        onlySponsor(projectId)
        nonReentrant 
    {
        Project storage project = projects[projectId];
        require(block.timestamp >= project.endTime, "Project not ended");
        require(!project.sponsorRefunded, "Refund already claimed");
        
        // REFINED: Refund based on what's NOT verified and NOT submitted
        // totalPossiblePoints - totalVerifiedPoints is now correct because 
        // submitted but unverified tasks are "earned" on project end via contributor's claim.
        // However, if some contributors NEVER claim, their points stay in pool.
        // To be safe and fair, sponsor gets back points from Open and Claimed (unsubmitted) tasks.
        
        uint256 unearnedPoints = 0;
        for (uint256 i = 0; i < project.tasks.length; i++) {
            if (project.tasks[i].status == TaskStatus.Open || project.tasks[i].status == TaskStatus.Claimed) {
                unearnedPoints += project.tasks[i].points;
            }
        }

        require(unearnedPoints > 0, "No unearned points to refund");
        uint256 refundAmount = (unearnedPoints * project.contributorPool) / project.totalPossiblePoints;
        project.sponsorRefunded = true;
        
        (bool success, ) = project.sponsor.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }

    /**
     * @notice Users with 0.2 ETH earnings can claim a Verifier NFT
     */
    function claimVerifierNFT() external {
        require(verifierInfo[msg.sender].totalEarned >= VERIFIER_ELIGIBILITY_THRESHOLD, "Ineligible to claim NFT");
        standardNFT.mint(msg.sender);
        emit VerifierNFTClaimed(msg.sender);
    }
    
    // View Functions
    
    /**
     * @notice Check if address is eligible to verify (has NFT OR earned 0.2 ETH)
     */
    function isEligibleVerifier(address account) public view returns (bool) {
       
        for (uint i = 0; i < 3; i++) {
            if (hardcodedVerifiers[i] == account) return true;
        }
        return genesisNFT.isGenesisVerifier(account) || 
               standardNFT.isVerifierNFT(account) || 
               verifierInfo[account].totalEarned >= VERIFIER_ELIGIBILITY_THRESHOLD;
    }
    
    function getProjectCounter() external view returns (uint256) {
        return projectCounter;
    }
    
    function getProjectDetailed(uint256 projectId) external view returns (
        string memory name,
        address sponsor,
        uint256 contributorPool,
        uint256 verifierPool,
        uint256 endTime,
        uint256 totalVerifiedPoints,
        uint256 totalVerifierPoints,
        uint256 totalPossiblePoints,
        bool sponsorRefunded,
        uint256 phaseCount,
        uint256 taskCount
    ) {
        Project storage p = projects[projectId];
        return (p.name, p.sponsor, p.contributorPool, p.verifierPool, p.endTime, p.totalVerifiedPoints, p.totalVerifierPoints, p.totalPossiblePoints, p.sponsorRefunded, p.phases.length, p.tasks.length);
    }

    function getProject(uint256 projectId) external view projectExists(projectId) returns (string memory name, address sponsor, uint256 contributorPool, uint256 verifierPool, uint256 endTime, uint256 phaseCount, uint256 taskCount) {
        Project storage p = projects[projectId];
        return (p.name, p.sponsor, p.contributorPool, p.verifierPool, p.endTime, p.phases.length, p.tasks.length);
    }
    
    function getPhase(uint256 projectId, uint256 phaseId) external view projectExists(projectId) returns (string memory name, uint256 taskCount, uint256 verifiedTaskCount, bool unlocked) {
        require(phaseId < projects[projectId].phases.length, "Phase does not exist");
        Phase storage phase = projects[projectId].phases[phaseId];
        return (phase.name, phase.taskIds.length, phase.verifiedTaskCount, phase.unlocked);
    }
    
    function getTask(uint256 projectId, uint256 taskId, address caller) 
        external 
        view 
        returns (
            uint256 phaseId,
            string memory description,
            uint256 points,
            address claimant,
            string memory proofUrl,
            TaskStatus status,
            uint256 voteCount,
            uint256 claimDeadline,
            bool hasVoted
        ) 
    {
        Task storage task = projects[projectId].tasks[taskId];
        return (
            task.phaseId,
            task.description,
            task.points,
            task.claimant,
            task.proofUrl,
            task.status,
            task.votes.length,
            task.claimDeadline,
            task.hasVoted[caller]
        );
    }
    
    function getContributorPoints(uint256 projectId, address contributor) external view projectExists(projectId) returns (uint256) {
        return projects[projectId].contributorPoints[contributor];
    }
    
    function getVerifierPoints(uint256 projectId, address verifier) external view projectExists(projectId) returns (uint256) {
        return projects[projectId].verifierPoints[verifier];
    }
    
    function getProjectedContributorReward(uint256 projectId, address contributor) external view projectExists(projectId) returns (uint256) {
        Project storage p = projects[projectId];
        uint256 points = p.contributorPoints[contributor];
        if (p.totalPossiblePoints == 0) return 0;
        return (points * p.contributorPool) / p.totalPossiblePoints;
    }
    
    function getProjectedVerifierReward(uint256 projectId, address verifier) external view projectExists(projectId) returns (uint256) {
        Project storage p = projects[projectId];
        uint256 points = p.verifierPoints[verifier];
        if (p.totalVerifierPoints == 0) return 0;
        return (points * p.verifierPool) / p.totalVerifierPoints;
    }
    
    function getLeaderboard() external view returns (address[] memory earners, uint256[] memory earnings) {
        uint256 count = rewardEarners.length;
        earners = new address[](count);
        earnings = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            earners[i] = rewardEarners[i];
            earnings[i] = globalEarnings[rewardEarners[i]];
        }
        
        return (earners, earnings);
    }
    function hasClaimed(uint256 projectId, address account) public view returns (bool contributorClaimed, bool verifierClaimed) {
        Project storage p = projects[projectId];
        return (p.contributorClaimed[account], p.verifierClaimed[account]);
    }
}

