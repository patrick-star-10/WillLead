// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WillLeadSignalEmitter {
    event StrategySignal(
        address indexed wallet,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 executionNonce,
        uint256 emittedAt
    );

    function emitSignal(
        address wallet,
        address token,
        address recipient,
        uint256 amount,
        uint256 executionNonce
    ) external {
        emit StrategySignal(wallet, token, recipient, amount, executionNonce, block.timestamp);
    }
}

