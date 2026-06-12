// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MantleAgentWallet.sol";
import "../src/AgentIdentity.sol";

// Malicious contract used to test reentrancy protection
contract ReentrantAttacker {
    MantleAgentWallet public target;
    uint256 public attackCount;

    constructor(address _target) {
        target = MantleAgentWallet(payable(_target));
    }

    receive() external payable {
        if (attackCount < 3) {
            attackCount++;
            // Attempt reentrant call — should revert due to ReentrancyGuard
            target.transferMNT(payable(address(this)), 0.1 ether);
        }
    }
}

contract MantleAgentWalletTest is Test {
    MantleAgentWallet public wallet;
    AgentIdentity public identity;

    address public owner = address(this);
    address public agent = address(0xA1);
    address public guardian = address(0xA2);
    address public stranger = address(0xBEEF);
    address public recipient = address(0xC1);

    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event TokenTransferred(address indexed token, address indexed to, uint256 amount);
    event SpendingPolicySet(address indexed token, uint256 perTxLimit, uint256 dailyLimit);

    function setUp() public {
        identity = new AgentIdentity();
        wallet = new MantleAgentWallet(agent, guardian, address(identity));

        // Fund wallet with MNT
        vm.deal(address(wallet), 100 ether);

        // Whitelist recipient and agent
        wallet.setWhitelist(recipient, true);
        wallet.setWhitelist(agent, true);
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    function test_DeployWithCorrectOwner() public {
        assertEq(wallet.owner(), owner);
        assertEq(wallet.agent(), agent);
        assertEq(wallet.guardian(), guardian);
    }

    function test_ZeroAddressAgent_Reverts() public {
        vm.expectRevert("MantleAgentWallet: zero agent");
        new MantleAgentWallet(address(0), guardian, address(identity));
    }

    function test_ZeroAddressGuardian_Reverts() public {
        vm.expectRevert("MantleAgentWallet: zero guardian");
        new MantleAgentWallet(agent, address(0), address(identity));
    }

    // ─── Spending Limits ───────────────────────────────────────────────────────

    function test_AgentCanTransferWithinLimit() public {
        uint256 balanceBefore = recipient.balance;
        vm.prank(agent);
        wallet.transferMNT(payable(recipient), 0.5 ether);
        assertEq(recipient.balance - balanceBefore, 0.5 ether);
    }

    function test_AgentCannotExceedPerTxLimit() public {
        // Default per-tx limit is 1 ether for MNT
        vm.prank(agent);
        vm.expectRevert("MantleAgentWallet: exceeds per-tx limit");
        wallet.transferMNT(payable(recipient), 1.1 ether);
    }

    function test_AgentCannotExceedDailyLimit() public {
        // Default daily limit is 10 ether; per-tx is 1 ether
        vm.startPrank(agent);
        for (uint256 i = 0; i < 10; i++) {
            wallet.transferMNT(payable(recipient), 1 ether);
        }
        // 11th transfer — should hit daily limit
        vm.expectRevert("MantleAgentWallet: exceeds daily limit");
        wallet.transferMNT(payable(recipient), 1 ether);
        vm.stopPrank();
    }

    function test_DailyLimitResetsNextDay() public {
        vm.startPrank(agent);
        for (uint256 i = 0; i < 10; i++) {
            wallet.transferMNT(payable(recipient), 1 ether);
        }
        vm.stopPrank();

        // Advance time by 1 day
        vm.warp(block.timestamp + 1 days + 1);
        vm.deal(address(wallet), 100 ether);

        // Should succeed after daily reset
        vm.prank(agent);
        wallet.transferMNT(payable(recipient), 1 ether);
    }

    // ─── Whitelist ─────────────────────────────────────────────────────────────

    function test_OnlyWhitelistedAddressesAccepted() public {
        vm.prank(agent);
        vm.expectRevert("MantleAgentWallet: recipient not whitelisted");
        wallet.transferMNT(payable(stranger), 0.1 ether);
    }

    function test_OwnerCanAddToWhitelist() public {
        wallet.setWhitelist(stranger, true);
        assertTrue(wallet.whitelist(stranger));
    }

    function test_NonOwnerCannotModifyWhitelist() public {
        vm.prank(stranger);
        vm.expectRevert();
        wallet.setWhitelist(stranger, true);
    }

    // ─── Guardian Controls ─────────────────────────────────────────────────────

    function test_GuardianCanPause() public {
        vm.prank(guardian);
        vm.expectEmit(true, false, false, false);
        emit Paused(guardian);
        wallet.pause();
        assertTrue(wallet.paused());
    }

    function test_GuardianCanUnpause() public {
        vm.prank(guardian);
        wallet.pause();

        vm.prank(guardian);
        vm.expectEmit(true, false, false, false);
        emit Unpaused(guardian);
        wallet.unpause();
        assertFalse(wallet.paused());
    }

    function test_NonGuardianCannotPause() public {
        vm.prank(stranger);
        vm.expectRevert("MantleAgentWallet: caller is not guardian");
        wallet.pause();
    }

    function test_PausedWalletBlocksTransfers() public {
        vm.prank(guardian);
        wallet.pause();

        vm.prank(agent);
        vm.expectRevert("MantleAgentWallet: wallet is paused");
        wallet.transferMNT(payable(recipient), 0.1 ether);
    }

    // ─── Timelock ──────────────────────────────────────────────────────────────

    function test_TimelockPreventsImmediateExecution() public {
        bytes memory data = abi.encodeWithSelector(
            wallet.setSpendingPolicy.selector,
            address(0),
            100 ether,
            1000 ether
        );
        bytes32 actionId = wallet.scheduleTimelockAction(data);

        vm.expectRevert("MantleAgentWallet: timelock not elapsed");
        wallet.executeTimelockAction(actionId);
    }

    function test_TimelockExecutesAfterDelay() public {
        bytes memory data = abi.encodeWithSelector(
            wallet.setSpendingPolicy.selector,
            address(0),
            100 ether,
            1000 ether
        );
        bytes32 actionId = wallet.scheduleTimelockAction(data);

        vm.warp(block.timestamp + 2 days + 1);
        wallet.executeTimelockAction(actionId);

        (uint256 perTxLimit, uint256 dailyLimit,,,) = wallet.tokenPolicies(address(0));
        assertEq(perTxLimit, 100 ether);
        assertEq(dailyLimit, 1000 ether);
    }

    function test_TimelockCanBeCancelled() public {
        bytes memory data = abi.encodeWithSelector(
            wallet.setSpendingPolicy.selector,
            address(0),
            100 ether,
            1000 ether
        );
        bytes32 actionId = wallet.scheduleTimelockAction(data);
        wallet.cancelTimelockAction(actionId);

        vm.warp(block.timestamp + 2 days + 1);
        vm.expectRevert("MantleAgentWallet: cancelled");
        wallet.executeTimelockAction(actionId);
    }

    // ─── Reentrancy ────────────────────────────────────────────────────────────

    function test_ReentrancyAttackReverts() public {
        ReentrantAttacker attacker = new ReentrantAttacker(address(wallet));

        // Whitelist the attacker
        wallet.setWhitelist(address(attacker), true);

        // Agent attempts to send to attacker — attacker tries to reenter
        vm.prank(agent);
        vm.expectRevert();
        wallet.transferMNT(payable(address(attacker)), 0.1 ether);
    }

    // ─── Execute with Identity ─────────────────────────────────────────────────

    function test_ExecuteWithIdentityRecordsAction() public {
        uint256 tokenId = identity.mintIdentity(agent, "TestAgent", "trading");
        // Transfer identity ownership to wallet so wallet can call recordAction on-chain
        identity.transferOwnership(address(wallet));
        vm.deal(address(wallet), 100 ether);

        vm.prank(agent);
        wallet.executeWithIdentity(recipient, 0, "", "test action");

        AgentIdentity.ActionLog[] memory logs = identity.getActionLogs(tokenId);
        assertEq(logs.length, 1);
        assertEq(logs[0].action, "test action");
    }

    // ─── Spending Policy ───────────────────────────────────────────────────────

    function test_OwnerCanSetSpendingPolicy() public {
        vm.expectEmit(true, false, false, true);
        emit SpendingPolicySet(address(0), 5 ether, 50 ether);
        wallet.setSpendingPolicy(address(0), 5 ether, 50 ether);

        (uint256 perTx, uint256 daily,,,) = wallet.tokenPolicies(address(0));
        assertEq(perTx, 5 ether);
        assertEq(daily, 50 ether);
    }

    function test_GetDailyRemaining() public {
        uint256 remaining = wallet.getDailyRemaining(address(0));
        assertEq(remaining, 10 ether); // default daily limit

        vm.prank(agent);
        wallet.transferMNT(payable(recipient), 0.5 ether); // within 1 ether per-tx limit

        assertEq(wallet.getDailyRemaining(address(0)), 9.5 ether);
    }

    // ─── Role Management ───────────────────────────────────────────────────────

    function test_OwnerCanUpdateAgent() public {
        wallet.setAgent(stranger);
        assertEq(wallet.agent(), stranger);
    }

    function test_OwnerCanUpdateGuardian() public {
        wallet.setGuardian(stranger);
        assertEq(wallet.guardian(), stranger);
    }

    function test_OwnerCannotSetZeroAgent() public {
        vm.expectRevert("MantleAgentWallet: zero address");
        wallet.setAgent(address(0));
    }

    // ─── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_TransferWithinLimits(uint256 amount) public {
        // Default per-tx limit is 1 ether
        amount = bound(amount, 1, 1 ether);
        vm.prank(agent);
        wallet.transferMNT(payable(recipient), amount);
        assertGe(recipient.balance, amount);
    }
}
