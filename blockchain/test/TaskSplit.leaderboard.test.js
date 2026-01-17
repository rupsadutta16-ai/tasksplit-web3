const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TaskSplit Leaderboard", function () {
    let TaskSplit;
    let taskSplit;
    let owner;
    let sponsor;
    let contributor1;
    let contributor2;

    beforeEach(async function () {
        [owner, sponsor, contributor1, contributor2] = await ethers.getSigners();
        TaskSplit = await ethers.getContractFactory("TaskSplit");
        taskSplit = await TaskSplit.deploy();
    });

    it("Should track global earnings and update leaderboard", async function () {
        // 1. Create Project
        const rewardAmount = ethers.parseEther("1.0");
        await taskSplit.connect(sponsor).createProject("Test Project", 10, { value: rewardAmount });
        const projectId = 0;

        // 2. Add Task
        await taskSplit.connect(sponsor).addTask(projectId, "Task 1", 100);
        const taskId = 0;

        // 3. Claim Task (Contributor 1)
        await taskSplit.connect(contributor1).claimTask(projectId, taskId);

        // 4. Submit Task
        await taskSplit.connect(contributor1).submitTask(projectId, taskId, "http://proof.com");

        // 5. Fast forward past challenge period
        await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
        await ethers.provider.send("evm_mine");

        // 6. Verify Task
        await taskSplit.connect(owner).verifyTask(projectId, taskId);

        // 7. Fast forward past project end
        await ethers.provider.send("evm_increaseTime", [10 * 24 * 3600]);
        await ethers.provider.send("evm_mine");

        // 8. Claim Reward
        await taskSplit.connect(contributor1).claimReward(projectId);

        // 9. Check Global Earnings
        const earnings = await taskSplit.globalEarnings(contributor1.address);
        expect(earnings).to.equal(rewardAmount);

        // 10. Check Leaderboard
        const [earners, earnedAmounts] = await taskSplit.getLeaderboard();
        expect(earners.length).to.equal(1);
        expect(earners[0]).to.equal(contributor1.address);
        expect(earnedAmounts[0]).to.equal(rewardAmount);
    });
});
