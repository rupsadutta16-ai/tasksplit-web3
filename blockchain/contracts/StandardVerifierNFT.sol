// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StandardVerifierNFT
 * @notice NFT for verifiers who reach the 0.2 ETH threshold on the TaskSplit platform
 */
contract StandardVerifierNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(address => bool) public hasMinted;

    constructor() ERC721("TaskSplit Verifier", "TSLV") Ownable(msg.sender) {}

    /**
     * @notice Mint a verifier NFT to an eligible user
     * @param to Address to receive the NFT
     */
    function mint(address to) external onlyOwner {
        require(!hasMinted[to], "Already claimed verifier NFT");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        hasMinted[to] = true;
    }

    /**
     * @notice Check if address currently holds a verifier NFT
     * @param account Address to check
     * @return True if account holds at least one verifier NFT
     */
    function isVerifierNFT(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }
}
