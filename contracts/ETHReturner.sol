// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStake {
    function depositETH() external payable;
    function unstake(uint256 _pid, uint256 _amount) external;
    function withdraw(uint256 _pid) external;
}

/**
 * @title ETHReturner
 * @notice Acts as a staking user whose fallback returns data, triggering
 * the data.length > 0 code path in MetaNodeStake._safeETHTransfer.
 *
 * NO receive() function — so empty-calldata ETH transfers trigger fallback(),
 * which returns abi.encode(true), making data.length > 0.
 */
contract ETHReturner {
    IStake public stake;
    uint256 public balance;

    constructor(address _stake) {
        stake = IStake(_stake);
    }
    receive() external payable {
        balance += msg.value;
    }
    /// Deposit ETH into the staking contract
    function depositETH() external payable {
        stake.depositETH{value: msg.value}();
    }

    /// Unstake tokens
    function unstake(uint256 pid, uint256 amount) external {
        stake.unstake(pid, amount);
    }

    /// Withdraw — this triggers _safeETHTransfer to this contract
    function withdraw(uint256 pid) external {
        stake.withdraw(pid);
    }

    /// Fallback — called when ETH sent with empty calldata (from _safeETHTransfer).
    /// Returns abi.encode(true), making data.length > 0.
    fallback(bytes calldata) external payable returns (bytes memory) {
        balance += msg.value;
        return abi.encode(true);
    }
}
