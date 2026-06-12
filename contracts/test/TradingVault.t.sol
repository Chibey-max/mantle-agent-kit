// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TradingVault.sol";

contract TradingVaultTest is Test {
    TradingVault public vault;

    address public owner = address(this);
    address public agent = address(0xA1);
    address public depositor = address(0xD1);
    address public stranger = address(0xBEEF);

    event TradingHalted(address indexed by);
    event TradingResumed(address indexed by);
    event Deposited(address indexed depositor, address indexed token, uint256 amount);
    event Withdrawn(address indexed depositor, address indexed token, uint256 amount);
    event EmergencyWithdraw(address indexed to, address indexed token, uint256 amount);

    function setUp() public {
        vault = new TradingVault(agent, 500); // 5% daily loss limit
        vm.deal(depositor, 100 ether);
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    function test_DeployWithCorrectParams() public {
        assertEq(vault.agent(), agent);
        assertEq(vault.dailyLossLimitBps(), 500);
        assertEq(vault.owner(), owner);
        assertFalse(vault.tradingHalted());
    }

    function test_ZeroAgentReverts() public {
        vm.expectRevert("TradingVault: zero agent");
        new TradingVault(address(0), 500);
    }

    function test_LossLimitTooHighReverts() public {
        vm.expectRevert("TradingVault: loss limit too high");
        new TradingVault(agent, 2001); // > 20%
    }

    // ─── Deposits ──────────────────────────────────────────────────────────────

    function test_DepositMNT() public {
        vm.prank(depositor);
        vm.expectEmit(true, true, false, true);
        emit Deposited(depositor, address(0), 10 ether);
        vault.depositMNT{value: 10 ether}();

        assertEq(vault.mntDeposits(depositor), 10 ether);
        assertEq(vault.totalMntDeposited(), 10 ether);
        assertEq(address(vault).balance, 10 ether);
    }

    function test_DepositViaSend() public {
        vm.prank(depositor);
        (bool success,) = address(vault).call{value: 5 ether}("");
        assertTrue(success);
        assertEq(vault.mntDeposits(depositor), 5 ether);
    }

    function test_ZeroDepositReverts() public {
        vm.prank(depositor);
        vm.expectRevert("TradingVault: zero deposit");
        vault.depositMNT{value: 0}();
    }

    // ─── Withdrawals ───────────────────────────────────────────────────────────

    function test_WithdrawMNT() public {
        vm.prank(depositor);
        vault.depositMNT{value: 10 ether}();

        uint256 balanceBefore = depositor.balance;
        vm.prank(depositor);
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(depositor, address(0), 5 ether);
        vault.withdrawMNT(5 ether);

        assertEq(depositor.balance - balanceBefore, 5 ether);
        assertEq(vault.mntDeposits(depositor), 5 ether);
    }

    function test_WithdrawMoreThanDeposited_Reverts() public {
        vm.prank(depositor);
        vault.depositMNT{value: 5 ether}();

        vm.prank(depositor);
        vm.expectRevert("TradingVault: insufficient depositor balance");
        vault.withdrawMNT(6 ether);
    }

    function test_WithdrawWhenVaultDepletedByStrategy_Reverts() public {
        vm.prank(depositor);
        vault.depositMNT{value: 10 ether}();

        // Simulate vault spending MNT on a strategy
        // We do this by directly manipulating the vault balance
        // (In real use: executeStrategy drains vault balance)
        vm.deal(address(vault), 0); // drain vault

        vm.prank(depositor);
        vm.expectRevert("TradingVault: vault balance depleted by strategies");
        vault.withdrawMNT(1 ether);
    }

    // ─── Daily Loss Limit ──────────────────────────────────────────────────────

    function test_DailyLossLimitHaltsTrading() public {
        vm.prank(depositor);
        vault.depositMNT{value: 100 ether}();

        // Record a large loss (>5% of 100 ether = >5 ether)
        vm.prank(agent);
        vault.updatePnl(-6 ether);

        assertTrue(vault.tradingHalted());
    }

    function test_HaltCannotBeBypassedByAgent() public {
        vm.prank(depositor);
        vault.depositMNT{value: 100 ether}();

        vm.prank(agent);
        vault.updatePnl(-6 ether);
        assertTrue(vault.tradingHalted());

        // Agent cannot execute while halted
        vm.prank(agent);
        vm.expectRevert("TradingVault: trading is halted");
        vault.executeStrategy(address(0x1), "", 0, "test");
    }

    function test_OwnerCanHaltTrading() public {
        vm.expectEmit(true, false, false, false);
        emit TradingHalted(owner);
        vault.haltTrading();
        assertTrue(vault.tradingHalted());
    }

    function test_OwnerCanResumeTrading() public {
        vault.haltTrading();
        vm.expectEmit(true, false, false, false);
        emit TradingResumed(owner);
        vault.resumeTrading();
        assertFalse(vault.tradingHalted());
    }

    function test_TradingAutoResumesNextDay() public {
        vm.prank(depositor);
        vault.depositMNT{value: 100 ether}();

        vm.prank(agent);
        vault.updatePnl(-6 ether);
        assertTrue(vault.tradingHalted());

        // Advance to next day and trigger daily reset via depositMNT
        vm.warp(block.timestamp + 1 days + 1);

        // executeStrategy calls _checkDailyReset internally
        // Funding vault first
        vm.deal(address(vault), 10 ether);
        vm.prank(agent);
        vault.executeStrategy(address(this), "", 0, "test"); // will call _checkDailyReset
        assertFalse(vault.tradingHalted());
    }

    // ─── Position Management ───────────────────────────────────────────────────

    function test_OpenAndClosePosition() public {
        vm.prank(agent);
        bytes32 posId = vault.openPosition(
            address(0), // MNT
            1 ether,
            1000e18, // $1000 entry
            true, // long
            "RSI_EMA_CROSS"
        );

        TradingVault.Position memory pos = vault.getPosition(posId);
        assertTrue(pos.open);
        assertEq(pos.size, 1 ether);
        assertEq(pos.entryPrice, 1000e18);
        assertTrue(pos.isLong);

        vm.prank(agent);
        vault.closePosition(posId, 1100e18); // exit at $1100

        pos = vault.getPosition(posId);
        assertFalse(pos.open);
    }

    function test_CannotCloseAlreadyClosedPosition() public {
        vm.prank(agent);
        bytes32 posId = vault.openPosition(address(0), 1 ether, 1000e18, true, "test");

        vm.prank(agent);
        vault.closePosition(posId, 1100e18);

        vm.prank(agent);
        vm.expectRevert("TradingVault: position not open");
        vault.closePosition(posId, 1200e18);
    }

    function test_GetOpenPositions() public {
        vm.startPrank(agent);
        vault.openPosition(address(0), 1 ether, 1000e18, true, "s1");
        bytes32 pos2 = vault.openPosition(address(0), 2 ether, 2000e18, false, "s2");
        vault.openPosition(address(0), 0.5 ether, 500e18, true, "s3");
        vm.stopPrank();

        bytes32[] memory open = vault.getOpenPositions();
        assertEq(open.length, 3);

        vm.prank(agent);
        vault.closePosition(pos2, 1900e18);

        open = vault.getOpenPositions();
        assertEq(open.length, 2);
    }

    // ─── Strategy Execution Log ────────────────────────────────────────────────

    function test_StrategyExecutionLogged() public {
        vm.deal(address(vault), 10 ether);
        vm.prank(agent);
        vault.executeStrategy(address(this), "", 0, "RSI_LONG");

        assertEq(vault.getExecutionLogLength(), 1);
        TradingVault.StrategyExecution memory exec = vault.getExecutionLog(0);
        assertEq(exec.strategyName, "RSI_LONG");
        assertTrue(exec.success);
    }

    // ─── Emergency Withdraw ────────────────────────────────────────────────────

    function test_OwnerEmergencyWithdraw() public {
        vm.prank(depositor);
        vault.depositMNT{value: 10 ether}();

        address safeAddr = address(0x5AFE);
        uint256 balanceBefore = safeAddr.balance;

        vm.expectEmit(true, true, false, true);
        emit EmergencyWithdraw(safeAddr, address(0), 5 ether);
        vault.emergencyWithdraw(address(0), safeAddr, 5 ether);

        assertEq(safeAddr.balance - balanceBefore, 5 ether);
    }

    function test_NonOwnerCannotEmergencyWithdraw() public {
        vm.prank(depositor);
        vault.depositMNT{value: 10 ether}();

        vm.prank(stranger);
        vm.expectRevert();
        vault.emergencyWithdraw(address(0), stranger, 1 ether);
    }

    function test_EmergencyWithdrawZeroAddressReverts() public {
        vm.prank(depositor);
        vault.depositMNT{value: 10 ether}();

        vm.expectRevert("TradingVault: zero address");
        vault.emergencyWithdraw(address(0), address(0), 1 ether);
    }

    // ─── Access Control ────────────────────────────────────────────────────────

    function test_StrangerCannotExecuteStrategy() public {
        vm.prank(stranger);
        vm.expectRevert("TradingVault: caller is not agent");
        vault.executeStrategy(address(this), "", 0, "hack");
    }

    function test_AuthorizedStrategistCanExecute() public {
        vault.setStrategist(stranger, true);
        vm.deal(address(vault), 10 ether);
        vm.prank(stranger);
        vault.executeStrategy(address(this), "", 0, "authorized");
    }

    // Receive function so vault can call back to this test contract
    receive() external payable {}
}
