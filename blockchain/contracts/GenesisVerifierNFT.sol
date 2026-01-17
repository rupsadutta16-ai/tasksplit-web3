// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GenesisVerifierNFT
 * @notice NFT for genesis verifiers who bootstrap the TaskSplit verification system
 * @dev Minted by owner to trusted initial verifiers
 */
contract GenesisVerifierNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    
   
    mapping(address => bool) public hasBeenGenesisVerifier;
    
    event GenesisVerifierMinted(address indexed to, uint256 indexed tokenId);
    event GenesisVerifierBurned(uint256 indexed tokenId);
    
    constructor() ERC721("Genesis Verifier", "GENV") Ownable(msg.sender) {}
    
    /**
     * @notice Mint a genesis verifier NFT to a trusted address
     * @param to Address to receive the NFT
     */
    function mint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        hasBeenGenesisVerifier[to] = true;
        emit GenesisVerifierMinted(to, tokenId);
    }
    
    /**
     * @notice Batch mint genesis verifier NFTs
     * @param recipients Array of addresses to receive NFTs
     */
    function batchMint(address[] calldata recipients) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(recipients[i], tokenId);
            hasBeenGenesisVerifier[recipients[i]] = true;
            emit GenesisVerifierMinted(recipients[i], tokenId);
        }
    }
    
    /**
     * @notice Burn a genesis verifier NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        _burn(tokenId);
        emit GenesisVerifierBurned(tokenId);
    }
    
    /**
     * @notice Check if address currently holds a genesis NFT
     * @param account Address to check
     * @return True if account holds at least one genesis NFT
     */
    function isGenesisVerifier(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }
    
    /**
     * @notice Override to track historical genesis verifier status on transfer
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        if (to != address(0)) {
            hasBeenGenesisVerifier[to] = true;
        }
        return previousOwner;
    }
}
