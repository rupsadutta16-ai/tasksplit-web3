// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TaskSplit
 * @notice Optimistic Bounty Marketplace for decentralized task management
 * @dev Single contract implementation with multi-project support
 */
contract TaskSplit is ReentrancyGuard {
    
    // ============ Structs ============
    
    /**
     * @dev Represents a submission for a task
     * @param proofUrl URL containing proof of work completion
     * @param timestamp When the submission was made
     * @param verified Whether the submission has been verified (auto or manual)
     */
    struct Submission {
        string proofUrl;
        uint256 timestamp;
        bool verified;
    }
    
    /**
     * @dev Task status enumeration
     */
    enum TaskStatus {
        Open,           
        Claimed,        
        Submitted,      
        Flagged,        
        Verified        
    }
    
    /**
     * @dev Represents a single task within a project
     * @param description Task requirements and details
     * @param pointValue Points awarded upon completion
     * @param claimDeadline Deadline for completing claimed task (2 days from claim)
     * @param submission Submitted work details
     * @param status Current task status
     * @param claimant Address of current claimant
     * @param flagger Address who flagged the submission (if any)
     * @param flaggerStake Amount staked by flagger (0.005 ETH)
     * @param challengePeriodEnd Timestamp when challenge period ends (72 hours from submission)
     */
    struct Task {
        string description;
        uint256 pointValue;
        uint256 claimDeadline;
        Submission submission;
        TaskStatus status;
        address claimant;
        address flagger;
        uint256 flaggerStake;
        uint256 challengePeriodEnd;
    }
    
    /**
     * @dev Represents a project with associated tasks
     * @param name Project name
     * @param sponsor Project creator who funds and manages it
     * @param rewardPool Total ETH available for rewards
     * @param totalVerifiedPoints Sum of points from all verified tasks
     * @param endTime Timestamp when project ends and rewards become claimable
     * @param tasks Array of tasks in this project
     * @param contributorPoints Mapping of contributor addresses to their earned points
     * @param rewardClaimed Mapping tracking whether a contributor has claimed their reward
     * @param exists Flag to check if project exists
     */
    struct Project {
        string name;
        address sponsor;
        uint256 rewardPool;
        uint256 initialRewardPool;
        uint256 totalVerifiedPoints;
        uint256 endTime;
        Task[] tasks;
        mapping(address => uint256) contributorPoints;
        mapping(address => bool) rewardClaimed;
        bool exists;
    }
    
    
    
    /// @dev Counter for generating unique project IDs
    uint256 private projectCounter;
    
    /// @dev Mapping of project ID to Project struct
    mapping(uint256 => Project) public projects;
    
    /// @dev Mapping tracking total ETH earned by each address across all projects
    mapping(address => uint256) public globalEarnings;

    /// @dev Array of all users who have earned rewards (for leaderboard)
    address[] public rewardEarners;

    /// @dev Mapping to check if user is already in rewardEarners array to prevent duplicates
    mapping(address => bool) private hasEarned;
    
    /// @dev Constant for claim deadline (2 days)
    uint256 private constant CLAIM_DEADLINE_DURATION = 2 days;
    
    /// @dev Constant for challenge period (72 hours)
    uint256 private constant CHALLENGE_PERIOD = 72 hours;
    
    /// @dev Constant for flagging stake (0.005 ETH)
    uint256 private constant FLAG_STAKE = 0.005 ether;
    
    
    
    event ProjectCreated(uint256 indexed projectId, string name, address indexed sponsor, uint256 rewardPool);
    event TaskAdded(uint256 indexed projectId, uint256 indexed taskId, string description, uint256 pointValue);
    event TaskClaimed(uint256 indexed projectId, uint256 indexed taskId, address indexed claimant, uint256 deadline);
    event TaskCancelled(uint256 indexed projectId, uint256 indexed taskId, address indexed claimant);
    event TaskSubmitted(uint256 indexed projectId, uint256 indexed taskId, address indexed contributor, string proofUrl, uint256 challengePeriodEnd);
    event TaskFlagged(uint256 indexed projectId, uint256 indexed taskId, address indexed flagger, uint256 stake);
    event DisputeResolved(uint256 indexed projectId, uint256 indexed taskId, bool approved, address indexed resolver);
    event TaskVerified(uint256 indexed projectId, uint256 indexed taskId, address indexed contributor, uint256 points);
    event RewardClaimed(uint256 indexed projectId, address indexed contributor, uint256 amount, uint256 points);
    
    // Modifiers 
    
    /**
     * @dev Ensures the caller is the project sponsor
     */
    modifier onlySponsor(uint256 projectId) {
        require(projects[projectId].exists, "Project does not exist");
        require(projects[projectId].sponsor == msg.sender, "Only sponsor can call this");
        _;
    }
    
    /**
     * @dev Ensures the caller is the current claimant of the task
     */
    modifier onlyClaimant(uint256 projectId, uint256 taskId) {
        require(projects[projectId].exists, "Project does not exist");
        require(taskId < projects[projectId].tasks.length, "Task does not exist");
        require(projects[projectId].tasks[taskId].claimant == msg.sender, "Only claimant can call this");
        _;
    }
    
    /**
     * @dev Ensures the project exists
     */
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].exists, "Project does not exist");
        _;
    }
    
    /**
     * @dev Ensures the task exists within the project
     */
    modifier taskExists(uint256 projectId, uint256 taskId) {
        require(projects[projectId].exists, "Project does not exist");
        require(taskId < projects[projectId].tasks.length, "Task does not exist");
        _;
    }
    
    // Core Functions
    
    /**
     * @notice Creates a new project with an initial ETH reward pool
     * @param name Name of the project
     * @param durationDays Duration in days for the project lifecycle
     * @return projectId The ID of the newly created project
     */
    function createProject(string calldata name, uint256 durationDays) external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH to create project");
        require(bytes(name).length > 0, "Project name cannot be empty");
        require(durationDays > 0, "Duration must be greater than zero");
        
        uint256 projectId = projectCounter++;
        Project storage project = projects[projectId];
        
        project.name = name;
        project.sponsor = msg.sender;
        project.rewardPool = msg.value;
        project.initialRewardPool = msg.value;
        project.totalVerifiedPoints = 0;
        project.endTime = block.timestamp + (durationDays * 1 days);
        project.exists = true;
        
        emit ProjectCreated(projectId, name, msg.sender, msg.value);
        
        return projectId;
    }
    
    /**
     * @notice Adds a new task to an existing project
     * @param projectId ID of the project
     * @param description Task description and requirements
     * @param points Point value for completing this task
     * @return taskId The ID of the newly created task
     */
    function addTask(
        uint256 projectId,
        string calldata description,
        uint256 points
    ) external onlySponsor(projectId) returns (uint256) {
        require(bytes(description).length > 0, "Task description cannot be empty");
        require(points > 0, "Points must be greater than zero");
        
        Project storage project = projects[projectId];
        
        Task memory newTask;
        newTask.description = description;
        newTask.pointValue = points;
        newTask.status = TaskStatus.Open;
        
        project.tasks.push(newTask);
        uint256 taskId = project.tasks.length - 1;
        
        emit TaskAdded(projectId, taskId, description, points);
        
        return taskId;
    }
    
    /**
     * @notice Claims an available task, setting a 2-day deadline
     * @param projectId ID of the project
     * @param taskId ID of the task to claim
     */
    function claimTask(uint256 projectId, uint256 taskId) external taskExists(projectId, taskId) {
        Task storage task = projects[projectId].tasks[taskId];
        
        // Check if task is available (either Open or expired Claimed)
        if (task.status == TaskStatus.Claimed) {
            require(block.timestamp > task.claimDeadline, "Task claim deadline has not expired");
        } else {
            require(task.status == TaskStatus.Open, "Task is not available for claiming");
        }
        
        task.claimant = msg.sender;
        task.status = TaskStatus.Claimed;
        task.claimDeadline = block.timestamp + CLAIM_DEADLINE_DURATION;
        
        emit TaskClaimed(projectId, taskId, msg.sender, task.claimDeadline);
    }
    
    /**
     * @notice Allows the current claimant to release the task immediately
     * @param projectId ID of the project
     * @param taskId ID of the task to cancel
     */
    function cancelTask(uint256 projectId, uint256 taskId) external onlyClaimant(projectId, taskId) {
        Task storage task = projects[projectId].tasks[taskId];
        require(task.status == TaskStatus.Claimed, "Task must be in Claimed status");
        
        address previousClaimant = task.claimant;
        
        task.claimant = address(0);
        task.status = TaskStatus.Open;
        task.claimDeadline = 0;
        
        emit TaskCancelled(projectId, taskId, previousClaimant);
    }
    
    /**
     * @notice Submits completed work for a claimed task, starting 72-hour challenge period
     * @param projectId ID of the project
     * @param taskId ID of the task being submitted
     * @param proofUrl URL containing proof of completed work
     */
    function submitTask(
        uint256 projectId,
        uint256 taskId,
        string calldata proofUrl
    ) external onlyClaimant(projectId, taskId) {
        Task storage task = projects[projectId].tasks[taskId];
        require(task.status == TaskStatus.Claimed, "Task must be in Claimed status");
        require(block.timestamp <= task.claimDeadline, "Claim deadline has expired");
        require(bytes(proofUrl).length > 0, "Proof URL cannot be empty");
        
        task.submission.proofUrl = proofUrl;
        task.submission.timestamp = block.timestamp;
        task.submission.verified = false;
        task.status = TaskStatus.Submitted;
        task.challengePeriodEnd = block.timestamp + CHALLENGE_PERIOD;
        
        emit TaskSubmitted(projectId, taskId, msg.sender, proofUrl, task.challengePeriodEnd);
    }
    
    /**
     * @notice Flags a submitted task as disputed, pausing auto-verification
     * @param projectId ID of the project
     * @param taskId ID of the task to flag
     */
    function flagSubmission(uint256 projectId, uint256 taskId) external payable taskExists(projectId, taskId) {
        require(msg.value == FLAG_STAKE, "Must send exactly 0.005 ETH to flag");
        
        Task storage task = projects[projectId].tasks[taskId];
        require(task.status == TaskStatus.Submitted, "Task must be in Submitted status");
        require(block.timestamp < task.challengePeriodEnd, "Challenge period has ended");
        require(task.flagger == address(0), "Task already flagged");
        
        task.status = TaskStatus.Flagged;
        task.flagger = msg.sender;
        task.flaggerStake = msg.value;
        
        emit TaskFlagged(projectId, taskId, msg.sender, msg.value);
    }
    
    /**
     * @notice Resolves a disputed task (only callable by sponsor)
     * @param projectId ID of the project
     * @param taskId ID of the disputed task
     * @param approveWork True to approve work (flagger stake goes to contributor), false to reject (flagger gets stake back)
     */
    function resolveDispute(
        uint256 projectId,
        uint256 taskId,
        bool approveWork
    ) external onlySponsor(projectId) taskExists(projectId, taskId) nonReentrant {
        Project storage project = projects[projectId];
        Task storage task = project.tasks[taskId];
        require(task.status == TaskStatus.Flagged, "Task is not flagged");
        
        address flagger = task.flagger;
        uint256 stake = task.flaggerStake;
        address contributor = task.claimant;
        
        if (approveWork) {
            // Approve work: flagger's stake goes to contributor, task is verified
            task.status = TaskStatus.Verified;
            task.submission.verified = true;
            
            // Award points to contributor
            project.contributorPoints[contributor] += task.pointValue;
            project.totalVerifiedPoints += task.pointValue;
            
            // Transfer flagger's stake to contributor
            (bool success, ) = contributor.call{value: stake}("");
            require(success, "Transfer to contributor failed");
            
            emit TaskVerified(projectId, taskId, contributor, task.pointValue);
        } else {
            // Reject work: flagger gets stake back
            // Do not reopen task if project has ended
            if (block.timestamp <= project.endTime) {
                task.status = TaskStatus.Open;
                task.claimant = address(0);
                task.claimDeadline = 0;
            } else {
                // Project ended, keep task in rejected state
                task.status = TaskStatus.Open;
                task.claimant = address(0);
                task.claimDeadline = 0;
            }
            
            task.submission.proofUrl = "";
            task.submission.timestamp = 0;
            
            // Return stake to flagger
            (bool success, ) = flagger.call{value: stake}("");
            require(success, "Transfer to flagger failed");
        }
        
        // Clear flagger data
        task.flagger = address(0);
        task.flaggerStake = 0;
        
        emit DisputeResolved(projectId, taskId, approveWork, msg.sender);
    }
    
    /**
     * @notice Auto-verifies submitted tasks after challenge period expires
     * @dev Can be called by anyone to trigger verification
     * @param projectId ID of the project
     * @param taskId ID of the task to verify
     */
    function verifyTask(uint256 projectId, uint256 taskId) external taskExists(projectId, taskId) {
        Project storage project = projects[projectId];
        Task storage task = project.tasks[taskId];
        
        require(task.status == TaskStatus.Submitted, "Task must be in Submitted status");
        require(block.timestamp >= task.challengePeriodEnd, "Challenge period has not ended");
        require(block.timestamp <= project.endTime, "Project ended");
        
        task.status = TaskStatus.Verified;
        task.submission.verified = true;
        
        // Award points to contributor
        address contributor = task.claimant;
        project.contributorPoints[contributor] += task.pointValue;
        project.totalVerifiedPoints += task.pointValue;
        
        emit TaskVerified(projectId, taskId, contributor, task.pointValue);
    }
    
    /**
     * @notice Claims proportional reward based on verified points
     * @dev Rewards are distributed proportionally based on total verified points.
     *      Claim timing does NOT affect payout size.
     *      Formula: Reward = (UserPoints * TotalPool) / TotalVerifiedPoints
     * @param projectId ID of the project to claim rewards from
     */
    function claimReward(uint256 projectId) external projectExists(projectId) nonReentrant {
        Project storage project = projects[projectId];
    
        require(block.timestamp >= project.endTime, "Project not ended");
        require(!project.rewardClaimed[msg.sender], "Reward already claimed");
    
        uint256 userPoints = project.contributorPoints[msg.sender];
        require(userPoints > 0, "No points earned");
        require(project.totalVerifiedPoints > 0, "No verified points");
    
        uint256 reward =
            (userPoints * project.initialRewardPool) /
            project.totalVerifiedPoints;
    
        project.rewardClaimed[msg.sender] = true;

        // Update global earnings
        globalEarnings[msg.sender] += reward;
        
        // Add to reward earners list if not already present
        if (!hasEarned[msg.sender]) {
            rewardEarners.push(msg.sender);
            hasEarned[msg.sender] = true;
        }
    
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
    
        emit RewardClaimed(projectId, msg.sender, reward, userPoints);
    }

    // View Functions
    
    /**
     * @notice Gets project details
     * @param projectId ID of the project
     * @return name Project name
     * @return sponsor Project sponsor address
     * @return rewardPool Current reward pool balance
     * @return totalVerifiedPoints Total verified points in project
     * @return taskCount Number of tasks in project
     */
    function getProject(uint256 projectId) external view projectExists(projectId) returns (
        string memory name,
        address sponsor,
        uint256 rewardPool,
        uint256 totalVerifiedPoints,
        uint256 taskCount
    ) {
        Project storage project = projects[projectId];
        return (
            project.name,
            project.sponsor,
            project.rewardPool,
            project.totalVerifiedPoints,
            project.tasks.length
        );
    }
    
    /**
     * @notice Gets task details
     * @param projectId ID of the project
     * @param taskId ID of the task
     * @return description Task description
     * @return pointValue Points awarded for completion
     * @return claimDeadline Deadline for completion (if claimed)
     * @return status Current task status
     * @return claimant Current claimant address
     * @return proofUrl Submitted proof URL
     * @return verified Whether submission is verified
     */
    function getTask(uint256 projectId, uint256 taskId) external view taskExists(projectId, taskId) returns (
        string memory description,
        uint256 pointValue,
        uint256 claimDeadline,
        TaskStatus status,
        address claimant,
        string memory proofUrl,
        bool verified
    ) {
        Task storage task = projects[projectId].tasks[taskId];
        return (
            task.description,
            task.pointValue,
            task.claimDeadline,
            task.status,
            task.claimant,
            task.submission.proofUrl,
            task.submission.verified
        );
    }
    
    /**
     * @notice Gets contributor points for a project
     * @param projectId ID of the project
     * @param contributor Address of the contributor
     * @return points Number of points earned by contributor
     */
    function getContributorPoints(uint256 projectId, address contributor) external view projectExists(projectId) returns (uint256) {
        return projects[projectId].contributorPoints[contributor];
    }
    
    /**
     * @notice Calculates the projected reward for a contributor
     * @dev This is a read-only helper for frontends and judges
     *      Returns the reward amount based on current state without modifying anything
     * @param projectId ID of the project
     * @param contributor Address of the contributor
     * @return Projected reward amount in wei
     */
    function getProjectedReward(uint256 projectId, address contributor) external view projectExists(projectId) returns (uint256) {
        Project storage project = projects[projectId];
        
        if (project.totalVerifiedPoints == 0) {
            return 0;
        }
        
        uint256 contributorPoints = project.contributorPoints[contributor];
        return (contributorPoints * project.initialRewardPool) / project.totalVerifiedPoints;
    }
    

    /**
     * @notice Returns the full leaderboard of all earners
     * @return earners Array of addresses who have earned rewards
     * @return earnings Array of corresponding total ETH earned
     */
    function getLeaderboard() external view returns (address[] memory earners, uint256[] memory earnings) {
        uint256 count = rewardEarners.length;
        earners = new address[](count);
        earnings = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            address earner = rewardEarners[i];
            earners[i] = earner;
            earnings[i] = globalEarnings[earner];
        }
        
        return (earners, earnings);
    }

    /**
     * @notice Gets the current project counter (total projects created)
     * @return Current project counter value
     */
    function getProjectCounter() external view returns (uint256) {
        return projectCounter;
    }
}