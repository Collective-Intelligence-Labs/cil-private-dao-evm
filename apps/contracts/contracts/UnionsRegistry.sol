// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphoreVerifier.sol";

contract UnionsRegistry is SemaphoreGroups {
    ISemaphoreVerifier public verifier;
    uint256 public depth = 32;

    // Mapping to track nullifiers to prevent double invitations/joins
    mapping(uint256 => bool) public nullifierHashes;

    // Store group IDs
    uint256[] private groupIds;

    constructor(ISemaphoreVerifier _verifier) {
        verifier = _verifier;
    }

    function createGroup(uint256 groupId, uint256 creator) external {
        require(!_groupExists(groupId), "Group already exists");
        _createGroup(groupId, depth);
        _addMember(groupId, creator);
        groupIds.push(groupId); // Store new group ID
    }

    function addMember(
        uint256 groupId, 
        uint256 member, 
        uint256 inviteNullifierHash, 
        uint256 joinNullifierHash,
        uint256[8] calldata inviteProof, 
        uint256[8] calldata joinProof
    ) external {
        require(_groupExists(groupId), "Group does not exist");
        require(!nullifierHashes[inviteNullifierHash], "Invite already used");
        require(!nullifierHashes[joinNullifierHash], "Join request already used");

        uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);
        verifier.verifyProof(merkleTreeRoot, inviteNullifierHash, member, groupId, inviteProof, depth);
        verifier.verifyProof(merkleTreeRoot, joinNullifierHash, groupId, groupId, joinProof, depth);

        nullifierHashes[inviteNullifierHash] = true;
        nullifierHashes[joinNullifierHash] = true;

        _addMember(groupId, member);
    }

    function listGroups() external view returns (uint256[] memory) {
        return groupIds;
    }
}
