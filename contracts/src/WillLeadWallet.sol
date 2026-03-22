// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Like} from "./interfaces/IERC20Like.sol";

contract WillLeadWallet {
    enum RuntimeStatus {
        Inactive,
        Active,
        Paused,
        Exhausted
    }

    struct IntentConfig {
        bool enabled;
        address token;
        address recipient;
        uint256 amountPerExecution;
        uint256 maxExecutions;
        uint256 executedCount;
    }

    error Unauthorized();
    error InvalidConfig();
    error InvalidRuntimeStatus();
    error IntentExecutionLimitReached();
    error DuplicateSignal();
    error InvalidIntentMatch();
    error NativeTransferFailed();

    event IntentConfigured(
        address indexed wallet,
        address indexed token,
        address indexed recipient,
        uint256 amountPerExecution,
        uint256 maxExecutions,
        uint256 minAutomationBalance
    );
    event RuntimeStatusUpdated(address indexed wallet, RuntimeStatus status);
    event IntentExecuted(
        address indexed wallet,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 executionNonce,
        bytes32 signalHash,
        uint256 originTxHash
    );
    event IntentExecutionSkipped(
        address indexed wallet,
        uint256 executionNonce,
        bytes32 signalHash,
        string reason
    );
    event FundsWithdrawn(address indexed wallet, address indexed token, address indexed to, uint256 amount);
    event RuntimeBindingConfigured(
        address indexed wallet,
        address indexed listener,
        address indexed signalEmitter,
        uint256 sourceChainId,
        uint256 destinationChainId,
        uint256 strategySignalTopic0
    );

    address public immutable callbackProxy;
    address public immutable authorizedRvmId;
    address public listener;
    address public signalEmitter;
    uint256 public sourceChainId;
    uint256 public destinationChainId;
    uint256 public strategySignalTopic0;
    address public owner;
    IntentConfig public intent;
    RuntimeStatus public runtimeStatus;
    uint256 public minAutomationBalance;
    uint256 public lastExecutionNonce;
    uint256 public lastExecutedAt;
    bytes32 public lastSignalHash;
    mapping(bytes32 => bool) public processedSignals;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyCallbackProxy() {
        if (msg.sender != callbackProxy) revert Unauthorized();
        _;
    }

    constructor(
        address initialOwner,
        address initialCallbackProxy,
        address initialAuthorizedRvmId,
        address initialListener,
        address initialSignalEmitter,
        uint256 initialSourceChainId,
        uint256 initialDestinationChainId
    ) {
        if (
            initialOwner == address(0) || initialCallbackProxy == address(0) || initialListener == address(0)
                || initialSignalEmitter == address(0) || initialSourceChainId == 0 || initialDestinationChainId == 0
        ) revert InvalidConfig();

        owner = initialOwner;
        callbackProxy = initialCallbackProxy;
        authorizedRvmId = initialAuthorizedRvmId;
        _configureRuntimeBinding(
            initialListener,
            initialSignalEmitter,
            initialSourceChainId,
            initialDestinationChainId,
            uint256(keccak256("StrategySignal(address,address,address,uint256,uint256,uint256)"))
        );
        runtimeStatus = RuntimeStatus.Inactive;
    }

    receive() external payable {}

    function configureIntent(
        address token,
        address recipient,
        uint256 amountPerExecution,
        uint256 maxExecutions,
        uint256 automationBalanceFloor
    ) external onlyOwner {
        if (recipient == address(0) || amountPerExecution == 0 || maxExecutions == 0) {
            revert InvalidConfig();
        }

        intent = IntentConfig({
            enabled: true,
            token: token,
            recipient: recipient,
            amountPerExecution: amountPerExecution,
            maxExecutions: maxExecutions,
            executedCount: 0
        });
        minAutomationBalance = automationBalanceFloor;
        lastExecutionNonce = 0;
        lastExecutedAt = 0;
        lastSignalHash = bytes32(0);
        runtimeStatus = RuntimeStatus.Active;

        emit IntentConfigured(address(this), token, recipient, amountPerExecution, maxExecutions, automationBalanceFloor);
        emit RuntimeStatusUpdated(address(this), runtimeStatus);
    }

    function configureRuntimeRoute(
        address runtimeListener,
        address runtimeSignalEmitter,
        uint256 runtimeSourceChainId,
        uint256 runtimeDestinationChainId,
        uint256 runtimeStrategySignalTopic0
    ) external onlyOwner {
        _configureRuntimeBinding(
            runtimeListener,
            runtimeSignalEmitter,
            runtimeSourceChainId,
            runtimeDestinationChainId,
            runtimeStrategySignalTopic0
        );
    }

    function pauseIntent() external onlyOwner {
        if (!intent.enabled || runtimeStatus != RuntimeStatus.Active) revert InvalidRuntimeStatus();

        runtimeStatus = RuntimeStatus.Paused;
        emit RuntimeStatusUpdated(address(this), runtimeStatus);
    }

    function resumeIntent() external onlyOwner {
        if (!intent.enabled || runtimeStatus != RuntimeStatus.Paused) revert InvalidRuntimeStatus();
        if (intent.executedCount >= intent.maxExecutions) revert IntentExecutionLimitReached();

        runtimeStatus = RuntimeStatus.Active;
        emit RuntimeStatusUpdated(address(this), runtimeStatus);
    }

    function callback(
        address rvmId,
        address token,
        address recipient,
        uint256 amount,
        uint256 executionNonce,
        uint256 emittedAt,
        uint256 originTxHash
    ) external onlyCallbackProxy {
        if (rvmId != authorizedRvmId) revert Unauthorized();

        bytes32 signalHash = keccak256(
            abi.encode(rvmId, token, recipient, amount, executionNonce, emittedAt, originTxHash)
        );

        if (runtimeStatus == RuntimeStatus.Paused) {
            emit IntentExecutionSkipped(address(this), executionNonce, signalHash, "intent paused");
            return;
        }
        if (runtimeStatus == RuntimeStatus.Exhausted || !intent.enabled) {
            emit IntentExecutionSkipped(address(this), executionNonce, signalHash, "intent inactive");
            return;
        }
        if (runtimeStatus != RuntimeStatus.Active) revert InvalidRuntimeStatus();
        if (intent.executedCount >= intent.maxExecutions) revert IntentExecutionLimitReached();
        if (processedSignals[signalHash] || executionNonce <= lastExecutionNonce) revert DuplicateSignal();
        if (intent.token != token || intent.recipient != recipient || intent.amountPerExecution != amount) {
            revert InvalidIntentMatch();
        }

        processedSignals[signalHash] = true;
        lastExecutionNonce = executionNonce;
        lastExecutedAt = block.timestamp;
        lastSignalHash = signalHash;
        intent.executedCount += 1;

        _executeTransfer(token, recipient, amount);

        if (intent.executedCount >= intent.maxExecutions) {
            runtimeStatus = RuntimeStatus.Exhausted;
            emit RuntimeStatusUpdated(address(this), runtimeStatus);
        }

        emit IntentExecuted(address(this), token, recipient, amount, executionNonce, signalHash, originTxHash);
    }

    function withdraw(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0) || amount == 0) revert InvalidConfig();

        if (token == address(0)) {
            (bool sent, ) = payable(to).call{value: amount}("");
            if (!sent) revert NativeTransferFailed();
        } else {
            bool ok = IERC20Like(token).transfer(to, amount);
            if (!ok) revert NativeTransferFailed();
        }

        emit FundsWithdrawn(address(this), token, to, amount);
    }

    function getIntentSummary()
        external
        view
        returns (
            RuntimeStatus status,
            address token,
            address recipient,
            uint256 amountPerExecution,
            uint256 maxExecutions,
            uint256 executedCount,
            uint256 automationBalanceFloor
        )
    {
        return (
            runtimeStatus,
            intent.token,
            intent.recipient,
            intent.amountPerExecution,
            intent.maxExecutions,
            intent.executedCount,
            minAutomationBalance
        );
    }

    function getRuntimeBinding()
        external
        view
        returns (
            address runtimeListener,
            address runtimeSignalEmitter,
            uint256 runtimeSourceChainId,
            uint256 runtimeDestinationChainId,
            uint256 runtimeStrategySignalTopic0
        )
    {
        return (listener, signalEmitter, sourceChainId, destinationChainId, strategySignalTopic0);
    }

    function _executeTransfer(address token, address recipient, uint256 amount) internal {
        if (token == address(0)) {
            (bool sent, ) = payable(recipient).call{value: amount}("");
            if (!sent) revert NativeTransferFailed();
            return;
        }

        bool ok = IERC20Like(token).transfer(recipient, amount);
        if (!ok) revert NativeTransferFailed();
    }

    function _configureRuntimeBinding(
        address runtimeListener,
        address runtimeSignalEmitter,
        uint256 runtimeSourceChainId,
        uint256 runtimeDestinationChainId,
        uint256 runtimeStrategySignalTopic0
    ) internal {
        if (
            runtimeListener == address(0) || runtimeSignalEmitter == address(0) || runtimeSourceChainId == 0
                || runtimeDestinationChainId == 0 || runtimeStrategySignalTopic0 == 0
        ) revert InvalidConfig();

        listener = runtimeListener;
        signalEmitter = runtimeSignalEmitter;
        sourceChainId = runtimeSourceChainId;
        destinationChainId = runtimeDestinationChainId;
        strategySignalTopic0 = runtimeStrategySignalTopic0;

        emit RuntimeBindingConfigured(
            address(this),
            runtimeListener,
            runtimeSignalEmitter,
            runtimeSourceChainId,
            runtimeDestinationChainId,
            runtimeStrategySignalTopic0
        );
    }
}
