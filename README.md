TaskSplit 🧩

Trustless collaboration through decentralized task verification

TaskSplit is a Web3-native platform that addresses the trust problem in remote collaboration by enforcing on-chain task verification and automated reward distribution. Sponsors pay only for verified work, contributors are rewarded fairly for completed tasks, and verification is handled by incentivized community verifiers rather than a centralized authority.

🚀 Deployed on Mantle Testnet

Motivation 💡

Remote collaboration often fails due to lack of trust.

⚠️ - Sponsors risk paying for incomplete or low-quality work
⚠️ - Contributors risk not being paid after completing tasks
⚠️ - Centralized platforms rely on manual moderation and dispute resolution

TaskSplit removes these risks by encoding collaboration rules directly into smart contracts.

Core Concepts ⚙️
Phased Project Structure 🧱

📌 - sponsors create project and set project deadline
📌 - Sponsors may optionally divide projects into multiple phases
📌 - Each phase contains a set of tasks
📌 - Phases unlock sequentially
📌 - A phase becomes available only after all tasks in the previous phase are completed and verified
📌 - This ensures structured execution and controlled project progress

Task Lifecycle 🔄

🛠️ - Sponsors create tasks with assigned point values
🛠️ - Contributors claim available tasks
🛠️ - Contributors submit proof of work on-chain
🛠️ - Verifiers review submissions using stake-based voting
🛠️ - Approved tasks are paid automatically after deadline

⏱️ Inactivity handling:

⏳ - Contributors may cancel a claimed task at any time
⏳ - If no submission is made within 2 days, the task is automatically cancelled and reopened
⏳ - Rejected tasks become available again for other contributors
⏳ - Tasks that are never claimed or submitted result in automatic refund of unused funds to the sponsor

Verification System 🗳️

🔐 - Verification is decentralized and stake-based
🔐 - Currently, 3 genesis verifiers are hardcoded into the protocol
🔐 - Each task requires votes from 3 verifiers
🔐 - Verifiers must stake ETH to approve or reject a submission
🔐 - The final decision is determined by majority vote

Becoming a Verifier 🌱

🌿 - There is no centralized whitelist for verifiers
🌿 - Any user may become a verifier after demonstrating reliability on the platform
🌿 - Users who earn sufficient ETH by completing tasks become eligible to participate in verification
🌿 - Experienced contributors naturally evolve into verifiers over time

Rewards and Incentives 💰

💸 - Sponsors define two separate reward pools
💸 - Contributor pool is distributed after project deadline based on points they earned from tasks
💸 - Verifier pool is distributed after the project deadline
💸 - Verifiers earn verifier points for participating in reviews
💸 - Verifiers can claim rewards proportional to the verifier points they earned

Key Properties ✅

✅ - Trust-minimized collaboration
✅ - Decentralized and stake-backed verification
✅ - Structured, phase-based execution
✅ - Automatic refund of unused funds
✅ - Fully transparent on-chain activity

Technology Stack 🧠

🧩 - Smart Contracts: Solidity
🧩 - Development Framework: Hardhat
🧩 - Frontend: React
🧩 - Wallet Integration: MetaMask
🧩 - Network: Mantle Testnet

Deployment 🚀

📍 - Network: Mantle Testnet
📍 - Status: Deployed and operational on testnet
📍 - Purpose: Demonstration and testing



Summary 🧠

TaskSplit enables decentralized collaboration where payments are released only after community verification, ensuring fairness for both sponsors and contributors without relying on centralized intermediaries.
