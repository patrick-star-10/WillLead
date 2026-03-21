// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WillLeadSignalEmitter {
    error Unauthorized();
    error InvalidIntent();
    error IntentInactive();
    error InvalidExecutionNonce();

    struct MirroredIntent {
        bool active;
        address token;
        address recipient;
        uint256 amountPerExecution;
        uint256 maxExecutions;
    }

    event StrategySignal(
        address indexed wallet,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 executionNonce,
        uint256 emittedAt
    );
    event MirroredIntentUpdated(
        address indexed wallet,
        address indexed token,
        address indexed recipient,
        uint256 amountPerExecution,
        uint256 maxExecutions,
        bool active
    );

    address public immutable operator;
    mapping(address => MirroredIntent) public mirroredIntentOf;

    modifier onlyOperator() {
        if (msg.sender != operator) revert Unauthorized();
        _;
    }

    constructor(address initialOperator) {
        if (initialOperator == address(0)) revert InvalidIntent();
        operator = initialOperator;
    }

    function emitSignal(
        address wallet,
        address token,
        address recipient,
        uint256 amount,
        uint256 executionNonce
    ) external {
        emit StrategySignal(wallet, token, recipient, amount, executionNonce, block.timestamp);
    }

    function syncIntent(
        address wallet,
        address token,
        address recipient,
        uint256 amountPerExecution,
        uint256 maxExecutions,
        bool active
    ) external onlyOperator {
        if (wallet == address(0)) {
            revert InvalidIntent();
        }
        if (active && (recipient == address(0) || amountPerExecution == 0 || maxExecutions == 0)) {
            revert InvalidIntent();
        }

        mirroredIntentOf[wallet] = MirroredIntent({
            active: active,
            token: token,
            recipient: recipient,
            amountPerExecution: amountPerExecution,
            maxExecutions: maxExecutions
        });

        emit MirroredIntentUpdated(wallet, token, recipient, amountPerExecution, maxExecutions, active);
    }

    function poke(address wallet, uint256 executionNonce) external {
        MirroredIntent memory intent = mirroredIntentOf[wallet];
        if (!intent.active) revert IntentInactive();
        if (executionNonce == 0 || executionNonce > intent.maxExecutions) revert InvalidExecutionNonce();

        emit StrategySignal(
            wallet,
            intent.token,
            intent.recipient,
            intent.amountPerExecution,
            executionNonce,
            block.timestamp
        );
    }
}
