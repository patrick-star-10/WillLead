// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Like} from "./interfaces/IERC20Like.sol";
import {IReactiveFaucet} from "./interfaces/IReactiveFaucet.sol";

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

    struct SwapIntentConfig {
        bool enabled;
        address faucet;
        address lreactRecipient;
        uint256 requestValue;
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
    event SwapIntentConfigured(
        address indexed wallet,
        address indexed faucet,
        address indexed lreactRecipient,
        uint256 requestValue,
        uint256 maxExecutions
    );
    event SwapRuntimeStatusUpdated(address indexed wallet, RuntimeStatus status);
    event IntentExecuted(
        address indexed wallet,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 executionNonce,
        bytes32 signalHash,
        uint256 originTxHash
    );
    event FaucetRequestExecuted(
        address indexed wallet,
        bytes32 indexed poolId,
        address indexed swapSender,
        address faucet,
        address lreactRecipient,
        uint256 requestValue,
        uint256 executionCount,
        uint256 originTxHash
    );
    event IntentExecutionSkipped(
        address indexed wallet,
        uint256 executionNonce,
        bytes32 signalHash,
        string reason
    );
    event SwapIntentExecutionSkipped(
        address indexed wallet,
        uint256 originTxHash,
        bytes32 callbackHash,
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
    event SwapRuntimeBindingConfigured(
        address indexed wallet,
        address indexed listener,
        address indexed poolManager,
        bytes32 watchedPoolId,
        uint256 sourceChainId,
        uint256 destinationChainId,
        uint256 swapTopic0
    );

    address public immutable callbackProxy;
    address public immutable authorizedRvmId;
    address public listener;
    address public signalEmitter;
    uint256 public sourceChainId;
    uint256 public destinationChainId;
    uint256 public strategySignalTopic0;
    address public swapListener;
    address public swapPoolManager;
    bytes32 public watchedSwapRouteId;
    uint256 public swapSourceChainId;
    uint256 public swapDestinationChainId;
    uint256 public swapTopic0;
    address public owner;
    IntentConfig public intent;
    SwapIntentConfig public swapIntent;
    RuntimeStatus public runtimeStatus;
    RuntimeStatus public swapRuntimeStatus;
    uint256 public minAutomationBalance;
    uint256 public lastExecutionNonce;
    uint256 public lastExecutedAt;
    bytes32 public lastSignalHash;
    mapping(bytes32 => bool) public processedSignals;
    bytes32 public lastSwapCallbackHash;
    uint256 public lastSwapOriginTxHash;
    uint256 public lastSwapExecutedAt;
    mapping(bytes32 => bool) public processedSwapSignals;

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
        swapRuntimeStatus = RuntimeStatus.Inactive;
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

    function configureSwapIntent(address faucet, address lreactRecipient, uint256 requestValue, uint256 maxExecutions)
        external
        onlyOwner
    {
        if (
            swapListener == address(0) || swapPoolManager == address(0) || watchedSwapRouteId == bytes32(0)
                || swapSourceChainId == 0 || swapDestinationChainId == 0 || swapTopic0 == 0 || faucet == address(0)
                || lreactRecipient == address(0) || requestValue == 0 || maxExecutions == 0
        ) revert InvalidConfig();

        swapIntent = SwapIntentConfig({
            enabled: true,
            faucet: faucet,
            lreactRecipient: lreactRecipient,
            requestValue: requestValue,
            maxExecutions: maxExecutions,
            executedCount: 0
        });
        lastSwapCallbackHash = bytes32(0);
        lastSwapOriginTxHash = 0;
        lastSwapExecutedAt = 0;
        swapRuntimeStatus = RuntimeStatus.Active;

        emit SwapIntentConfigured(address(this), faucet, lreactRecipient, requestValue, maxExecutions);
        emit SwapRuntimeStatusUpdated(address(this), swapRuntimeStatus);
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

    function configureSwapRuntimeRoute(
        address runtimeListener,
        address runtimePoolManager,
        bytes32 runtimeWatchedPoolId,
        uint256 runtimeSourceChainId,
        uint256 runtimeDestinationChainId,
        uint256 runtimeSwapTopic0
    ) external onlyOwner {
        _configureSwapRuntimeBinding(
            runtimeListener,
            runtimePoolManager,
            runtimeWatchedPoolId,
            runtimeSourceChainId,
            runtimeDestinationChainId,
            runtimeSwapTopic0
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

    function pauseSwapIntent() external onlyOwner {
        if (!swapIntent.enabled || swapRuntimeStatus != RuntimeStatus.Active) revert InvalidRuntimeStatus();

        swapRuntimeStatus = RuntimeStatus.Paused;
        emit SwapRuntimeStatusUpdated(address(this), swapRuntimeStatus);
    }

    function resumeSwapIntent() external onlyOwner {
        if (!swapIntent.enabled || swapRuntimeStatus != RuntimeStatus.Paused) revert InvalidRuntimeStatus();
        if (swapIntent.executedCount >= swapIntent.maxExecutions) revert IntentExecutionLimitReached();

        swapRuntimeStatus = RuntimeStatus.Active;
        emit SwapRuntimeStatusUpdated(address(this), swapRuntimeStatus);
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

    function callback(
        address rvmId,
        bytes32 poolId,
        address swapSender,
        int128 amount0,
        int128 amount1,
        uint160 sqrtPriceX96,
        uint128 liquidity,
        int24 tick,
        uint24 fee,
        uint256 originTxHash
    ) external onlyCallbackProxy {
        if (rvmId != authorizedRvmId) revert Unauthorized();
        if (
            poolId != watchedSwapRouteId || !swapIntent.enabled || swapIntent.faucet == address(0)
                || swapIntent.lreactRecipient == address(0) || swapIntent.requestValue == 0
        ) revert InvalidIntentMatch();

        bytes32 callbackHash =
            keccak256(abi.encode(rvmId, poolId, swapSender, amount0, amount1, sqrtPriceX96, liquidity, tick, fee, originTxHash));

        if (swapRuntimeStatus == RuntimeStatus.Paused) {
            emit SwapIntentExecutionSkipped(address(this), originTxHash, callbackHash, "intent paused");
            return;
        }
        if (swapRuntimeStatus == RuntimeStatus.Exhausted || !swapIntent.enabled) {
            emit SwapIntentExecutionSkipped(address(this), originTxHash, callbackHash, "intent inactive");
            return;
        }
        if (swapRuntimeStatus != RuntimeStatus.Active) revert InvalidRuntimeStatus();
        if (swapIntent.executedCount >= swapIntent.maxExecutions) revert IntentExecutionLimitReached();
        if (processedSwapSignals[callbackHash]) revert DuplicateSignal();
        if (address(this).balance < swapIntent.requestValue) {
            emit SwapIntentExecutionSkipped(address(this), originTxHash, callbackHash, "insufficient balance");
            return;
        }

        try IReactiveFaucet(swapIntent.faucet).request{value: swapIntent.requestValue}(swapIntent.lreactRecipient) {
            processedSwapSignals[callbackHash] = true;
            lastSwapCallbackHash = callbackHash;
            lastSwapOriginTxHash = originTxHash;
            lastSwapExecutedAt = block.timestamp;
            swapIntent.executedCount += 1;

            if (swapIntent.executedCount >= swapIntent.maxExecutions) {
                swapRuntimeStatus = RuntimeStatus.Exhausted;
                emit SwapRuntimeStatusUpdated(address(this), swapRuntimeStatus);
            }

            emit FaucetRequestExecuted(
                address(this),
                poolId,
                swapSender,
                swapIntent.faucet,
                swapIntent.lreactRecipient,
                swapIntent.requestValue,
                swapIntent.executedCount,
                originTxHash
            );
        } catch {
            emit SwapIntentExecutionSkipped(address(this), originTxHash, callbackHash, "faucet request failed");
        }
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

    function getSwapIntentSummary()
        external
        view
        returns (
            RuntimeStatus status,
            address faucet,
            address lreactRecipient,
            uint256 requestValue,
            uint256 maxExecutions,
            uint256 executedCount
        )
    {
        return (
            swapRuntimeStatus,
            swapIntent.faucet,
            swapIntent.lreactRecipient,
            swapIntent.requestValue,
            swapIntent.maxExecutions,
            swapIntent.executedCount
        );
    }

    function getSwapRuntimeBinding()
        external
        view
        returns (
            address runtimeListener,
            address runtimePoolManager,
            bytes32 runtimeWatchedPoolId,
            uint256 runtimeSourceChainId,
            uint256 runtimeDestinationChainId,
            uint256 runtimeSwapTopic0
        )
    {
        return (
            swapListener,
            swapPoolManager,
            watchedSwapRouteId,
            swapSourceChainId,
            swapDestinationChainId,
            swapTopic0
        );
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

    function _configureSwapRuntimeBinding(
        address runtimeListener,
        address runtimePoolManager,
        bytes32 runtimeWatchedPoolId,
        uint256 runtimeSourceChainId,
        uint256 runtimeDestinationChainId,
        uint256 runtimeSwapTopic0
    ) internal {
        if (
            runtimeListener == address(0) || runtimePoolManager == address(0) || runtimeWatchedPoolId == bytes32(0)
                || runtimeSourceChainId == 0 || runtimeDestinationChainId == 0 || runtimeSwapTopic0 == 0
        ) revert InvalidConfig();

        swapListener = runtimeListener;
        swapPoolManager = runtimePoolManager;
        watchedSwapRouteId = runtimeWatchedPoolId;
        swapSourceChainId = runtimeSourceChainId;
        swapDestinationChainId = runtimeDestinationChainId;
        swapTopic0 = runtimeSwapTopic0;

        emit SwapRuntimeBindingConfigured(
            address(this),
            runtimeListener,
            runtimePoolManager,
            runtimeWatchedPoolId,
            runtimeSourceChainId,
            runtimeDestinationChainId,
            runtimeSwapTopic0
        );
    }
}
