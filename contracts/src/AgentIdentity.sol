// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 inspired on-chain agent identity NFT for Mantle Agentic Wallet Economy
 * @dev Soulbound — transfers are blocked except by contract owner (for recovery).
 *      Approvals are fully disabled to prevent approval-based transfer workarounds.
 */
contract AgentIdentity is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;

    struct AgentProfile {
        string name;
        string agentType;
        uint256 reputation;
        uint256 actionCount;
        uint256 createdAt;
        uint256 lastActive;
        address agentAddress;
        bool active;
    }

    struct ActionLog {
        string action;
        bytes32 txHash;
        uint256 timestamp;
        bool success;
    }

    mapping(uint256 => AgentProfile) private _profiles;
    mapping(uint256 => ActionLog[]) private _actionLogs;
    mapping(address => uint256) public agentTokenId;

    uint256 public constant MAX_ACTION_LOGS = 100;

    event IdentityMinted(uint256 indexed tokenId, address indexed agent, string name, string agentType);
    event ActionRecorded(uint256 indexed tokenId, string action, bytes32 txHash, uint256 timestamp);
    event ReputationUpdated(uint256 indexed tokenId, uint256 oldReputation, uint256 newReputation);
    event IdentityDeactivated(uint256 indexed tokenId);

    constructor() ERC721("AgentIdentity", "AGID") Ownable(msg.sender) {}

    function mintIdentity(
        address agent,
        string calldata name,
        string calldata agentType
    ) external onlyOwner returns (uint256) {
        require(agent != address(0), "AgentIdentity: zero address");
        require(bytes(name).length > 0, "AgentIdentity: empty name");
        require(bytes(agentType).length > 0, "AgentIdentity: empty agentType");
        require(agentTokenId[agent] == 0, "AgentIdentity: agent already has identity");

        uint256 tokenId = ++_tokenIdCounter;
        _safeMint(agent, tokenId);

        _profiles[tokenId] = AgentProfile({
            name: name,
            agentType: agentType,
            reputation: 100,
            actionCount: 0,
            createdAt: block.timestamp,
            lastActive: block.timestamp,
            agentAddress: agent,
            active: true
        });

        agentTokenId[agent] = tokenId;
        emit IdentityMinted(tokenId, agent, name, agentType);
        return tokenId;
    }

    function recordAction(
        uint256 tokenId,
        string calldata action,
        bytes32 txHash
    ) external {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        require(
            msg.sender == _profiles[tokenId].agentAddress || msg.sender == owner(),
            "AgentIdentity: caller is not agent or owner"
        );
        require(bytes(action).length > 0, "AgentIdentity: empty action");

        ActionLog memory entry = ActionLog({
            action: action,
            txHash: txHash,
            timestamp: block.timestamp,
            success: true
        });

        if (_actionLogs[tokenId].length >= MAX_ACTION_LOGS) {
            for (uint256 i = 0; i < _actionLogs[tokenId].length - 1; i++) {
                _actionLogs[tokenId][i] = _actionLogs[tokenId][i + 1];
            }
            _actionLogs[tokenId][_actionLogs[tokenId].length - 1] = entry;
        } else {
            _actionLogs[tokenId].push(entry);
        }

        _profiles[tokenId].actionCount += 1;
        _profiles[tokenId].lastActive = block.timestamp;

        if (_profiles[tokenId].reputation < 1000) {
            uint256 oldRep = _profiles[tokenId].reputation;
            uint256 newRep = oldRep + 1 > 1000 ? 1000 : oldRep + 1;
            _profiles[tokenId].reputation = newRep;
            if (newRep != oldRep) emit ReputationUpdated(tokenId, oldRep, newRep);
        }

        emit ActionRecorded(tokenId, action, txHash, block.timestamp);
    }

    function updateReputation(uint256 tokenId, uint256 newReputation) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        require(newReputation <= 1000, "AgentIdentity: reputation exceeds max");
        uint256 oldRep = _profiles[tokenId].reputation;
        _profiles[tokenId].reputation = newReputation;
        emit ReputationUpdated(tokenId, oldRep, newReputation);
    }

    function deactivateIdentity(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        _profiles[tokenId].active = false;
        emit IdentityDeactivated(tokenId);
    }

    // ─── Views ─────────────────────────────────────────────────────────────────

    function getIdentity(uint256 tokenId) external view returns (AgentProfile memory) {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        return _profiles[tokenId];
    }

    function getActionLogs(uint256 tokenId) external view returns (ActionLog[] memory) {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        return _actionLogs[tokenId];
    }

    function getRecentActions(uint256 tokenId, uint256 count)
        external
        view
        returns (ActionLog[] memory)
    {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        ActionLog[] storage logs = _actionLogs[tokenId];
        uint256 len = logs.length;
        uint256 returnCount = count > len ? len : count;
        ActionLog[] memory result = new ActionLog[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            result[i] = logs[len - returnCount + i];
        }
        return result;
    }

    function totalIdentities() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ─── On-chain SVG metadata ──────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "AgentIdentity: token does not exist");
        AgentProfile memory profile = _profiles[tokenId];

        string memory activeLabel = profile.active ? "ACTIVE" : "DEACTIVATED";
        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
            '<rect width="400" height="400" fill="#0a0a0a" rx="16"/>',
            '<rect x="16" y="16" width="368" height="368" fill="none" stroke="#00d4aa" stroke-width="1.5" rx="12"/>',
            '<text x="200" y="60" text-anchor="middle" fill="#00d4aa" font-family="monospace" font-size="11" letter-spacing="3">MANTLE AGENT IDENTITY</text>',
            '<text x="200" y="110" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="22" font-weight="bold">', profile.name, '</text>',
            '<text x="200" y="140" text-anchor="middle" fill="#666666" font-family="monospace" font-size="11">', profile.agentType, '</text>',
            '<text x="200" y="210" text-anchor="middle" fill="#00d4aa" font-family="monospace" font-size="48" font-weight="bold">', profile.reputation.toString(), '</text>',
            '<text x="200" y="235" text-anchor="middle" fill="#555555" font-family="monospace" font-size="10" letter-spacing="2">REPUTATION</text>',
            '<line x1="60" y1="260" x2="340" y2="260" stroke="#1a1a1a" stroke-width="1"/>',
            '<text x="110" y="290" text-anchor="middle" fill="#888888" font-family="monospace" font-size="10">ACTIONS</text>',
            '<text x="110" y="310" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="16">', profile.actionCount.toString(), '</text>',
            '<text x="290" y="290" text-anchor="middle" fill="#888888" font-family="monospace" font-size="10">TOKEN ID</text>',
            '<text x="290" y="310" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="16">#', tokenId.toString(), '</text>',
            '<text x="200" y="365" text-anchor="middle" fill="#00d4aa" font-family="monospace" font-size="9" letter-spacing="1">ERC-8004 SOULBOUND  |  ', activeLabel, '</text>',
            '</svg>'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"', profile.name, ' #', tokenId.toString(), '",',
            '"description":"Mantle Agent Identity - ERC-8004 soulbound NFT with on-chain audit trail and reputation.",',
            '"attributes":[',
            '{"trait_type":"Agent Type","value":"', profile.agentType, '"},',
            '{"trait_type":"Reputation","value":', profile.reputation.toString(), '},',
            '{"trait_type":"Actions","value":', profile.actionCount.toString(), '},',
            '{"trait_type":"Status","value":"', activeLabel, '"}',
            '],"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // ─── Soulbound enforcement ──────────────────────────────────────────────────

    // Disable all approval mechanisms — approvals on a soulbound token are meaningless
    // and could confuse wallets/marketplaces into showing transfer options.
    function approve(address, uint256) public pure override {
        revert("AgentIdentity: approvals disabled for soulbound token");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("AgentIdentity: approvals disabled for soulbound token");
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && auth != owner()) {
            revert("AgentIdentity: identity is non-transferable");
        }
        if (to != address(0) && from != address(0)) {
            agentTokenId[from] = 0;
            agentTokenId[to] = tokenId;
            _profiles[tokenId].agentAddress = to;
        }
        // Pass address(0) as auth when called by owner to bypass OZ's _checkAuthorized —
        // we have already verified ownership above.
        address effectiveAuth = (from != address(0) && auth == owner()) ? address(0) : auth;
        return super._update(to, tokenId, effectiveAuth);
    }
}
