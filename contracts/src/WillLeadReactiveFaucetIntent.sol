// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReactiveFaucet} from "./interfaces/IReactiveFaucet.sol";

contract WillLeadReactiveFaucetIntent {
    enum RuntimeStatus {
        Inactive,
        Active,
        Paused,
        Exhausted
    }

    struct IntentConfig {
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
        address indexed intentWallet,
        address indexed faucet,
        address indexed lreactRecipient,
        uint256 requestValue,
        uint256 maxExecutions
    );
    event RuntimeStatusUpdated(address indexed intentWallet, RuntimeStatus status);
    event FaucetRequestExecuted(
        address indexed intentWallet,
        bytes32 indexed poolId,
        address indexed swapSender,
        address faucet,
        address lreactRecipient,
        uint256 requestValue,
        uint256 executionCount,
        uint256 originTxHash
    );
    event IntentExecutionSkipped(
        address indexed intentWallet,
        uint256 originTxHash,
        bytes32 callbackHash,
        string reason
    );
    event FundsWithdrawn(address indexed intentWallet, address indexed token, address indexed to, uint256 amount);
    event RuntimeBindingConfigured(
        address indexed intentWallet,
        address indexed listener,
        address indexed poolManager,
        bytes32 watchedPoolId,
        uint256 sourceChainId,
        uint256 destinationChainId,
        uint256 swapTopic0
    );

    address public immutable callbackProxy;
    address public immutable authorizedRvmId;
    address public owner;

    address public listener;
    address public poolManager;
    bytes32 public watchedPoolId;
    uint256 public sourceChainId;
    uint256 public destinationChainId;
    uint256 public swapTopic0;

    IntentConfig public intent;
    RuntimeStatus public runtimeStatus;
    bytes32 public lastCallbackHash;
    uint256 public lastOriginTxHash;
    uint256 public lastExecutedAt;
    mapping(bytes32 => bool) public processedSignals;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyCallbackProxy() {
        if (msg.sender != callbackProxy) revert Unauthorized();
        _;
    }

    constructor(address initialOwner, address initialCallbackProxy, address initialAuthorizedRvmId) {
        if (
            initialOwner == address(0) || initialCallbackProxy == address(0) || initialAuthorizedRvmId == address(0)
        ) revert InvalidConfig();

        owner = initialOwner;
        callbackProxy = initialCallbackProxy;
        authorizedRvmId = initialAuthorizedRvmId;
        runtimeStatus = RuntimeStatus.Inactive;
    }

    receive() external payable {}

    function configureIntent(address faucet, address lreactRecipient, uint256 requestValue, uint256 maxExecutions)
        external
        onlyOwner
    {
        if (
            listener == address(0) || poolManager == address(0) || watchedPoolId == bytes32(0) || sourceChainId == 0
                || destinationChainId == 0 || swapTopic0 == 0 || faucet == address(0) || lreactRecipient == address(0)
                || requestValue == 0 || maxExecutions == 0
        ) revert InvalidConfig();

        intent = IntentConfig({
            enabled: true,
            faucet: faucet,
            lreactRecipient: lreactRecipient,
            requestValue: requestValue,
            maxExecutions: maxExecutions,
            executedCount: 0
        });
        lastCallbackHash = bytes32(0);
        lastOriginTxHash = 0;
        lastExecutedAt = 0;
        runtimeStatus = RuntimeStatus.Active;

        emit IntentConfigured(address(this), faucet, lreactRecipient, requestValue, maxExecutions);
        emit RuntimeStatusUpdated(address(this), runtimeStatus);
    }

    function configureRuntimeRoute(
        address runtimeListener,
        address runtimePoolManager,
        bytes32 runtimeWatchedPoolId,
        uint256 runtimeSourceChainId,
        uint256 runtimeDestinationChainId,
        uint256 runtimeSwapTopic0
    ) external onlyOwner {
        if (
            runtimeListener == address(0) || runtimePoolManager == address(0) || runtimeWatchedPoolId == bytes32(0)
                || runtimeSourceChainId == 0 || runtimeDestinationChainId == 0 || runtimeSwapTopic0 == 0
        ) revert InvalidConfig();

        listener = runtimeListener;
        poolManager = runtimePoolManager;
        watchedPoolId = runtimeWatchedPoolId;
        sourceChainId = runtimeSourceChainId;
        destinationChainId = runtimeDestinationChainId;
        swapTopic0 = runtimeSwapTopic0;

        emit RuntimeBindingConfigured(
            address(this),
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
            poolId != watchedPoolId || !intent.enabled || intent.faucet == address(0) || intent.lreactRecipient == address(0)
                || intent.requestValue == 0
        ) revert InvalidIntentMatch();

        bytes32 callbackHash = keccak256(
            abi.encode(rvmId, poolId, swapSender, amount0, amount1, sqrtPriceX96, liquidity, tick, fee, originTxHash)
        );

        if (runtimeStatus == RuntimeStatus.Paused) {
            emit IntentExecutionSkipped(address(this), originTxHash, callbackHash, "intent paused");
            return;
        }
        if (runtimeStatus == RuntimeStatus.Exhausted || !intent.enabled) {
            emit IntentExecutionSkipped(address(this), originTxHash, callbackHash, "intent inactive");
            return;
        }
        if (runtimeStatus != RuntimeStatus.Active) revert InvalidRuntimeStatus();
        if (intent.executedCount >= intent.maxExecutions) revert IntentExecutionLimitReached();
        if (processedSignals[callbackHash]) revert DuplicateSignal();
        if (address(this).balance < intent.requestValue) {
            emit IntentExecutionSkipped(address(this), originTxHash, callbackHash, "insufficient balance");
            return;
        }

        try IReactiveFaucet(intent.faucet).request{value: intent.requestValue}(intent.lreactRecipient) {
            processedSignals[callbackHash] = true;
            lastCallbackHash = callbackHash;
            lastOriginTxHash = originTxHash;
            lastExecutedAt = block.timestamp;
            intent.executedCount += 1;

            if (intent.executedCount >= intent.maxExecutions) {
                runtimeStatus = RuntimeStatus.Exhausted;
                emit RuntimeStatusUpdated(address(this), runtimeStatus);
            }

            emit FaucetRequestExecuted(
                address(this),
                poolId,
                swapSender,
                intent.faucet,
                intent.lreactRecipient,
                intent.requestValue,
                intent.executedCount,
                originTxHash
            );
        } catch {
            emit IntentExecutionSkipped(address(this), originTxHash, callbackHash, "faucet request failed");
        }
    }

    function withdraw(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0) || amount == 0) revert InvalidConfig();

        if (token != address(0)) revert InvalidConfig();

        (bool sent,) = payable(to).call{value: amount}("");
        if (!sent) revert NativeTransferFailed();

        emit FundsWithdrawn(address(this), token, to, amount);
    }

    function getIntentSummary()
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
            runtimeStatus,
            intent.faucet,
            intent.lreactRecipient,
            intent.requestValue,
            intent.maxExecutions,
            intent.executedCount
        );
    }

    function getRuntimeBinding()
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
        return (listener, poolManager, watchedPoolId, sourceChainId, destinationChainId, swapTopic0);
    }
}
