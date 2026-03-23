// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbstractPausableReactive} from "../lib/reactive-lib/src/abstract-base/AbstractPausableReactive.sol";
import {IWillLeadReactiveFaucetIntent} from "./interfaces/IWillLeadReactiveFaucetIntent.sol";

contract WillLeadUniswapV4SwapListener is AbstractPausableReactive {
    struct SwapCallbackData {
        bytes32 poolId;
        address swapSender;
        int128 amount0;
        int128 amount1;
        uint160 sqrtPriceX96;
        uint128 liquidity;
        int24 tick;
        uint24 fee;
        uint256 originTxHash;
    }

    error InvalidSource();
    error InvalidLogRecord();

    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable poolManager;
    address public immutable targetIntent;
    bytes32 public immutable watchedPoolId;
    uint64 public callbackGasLimit;
    uint256 public immutable swapTopic0;

    constructor(
        address initialPoolManager,
        address initialTargetIntent,
        bytes32 initialWatchedPoolId,
        uint256 initialOriginChainId,
        uint256 initialDestinationChainId,
        uint64 initialCallbackGasLimit
    ) payable {
        if (
            initialPoolManager == address(0) || initialTargetIntent == address(0) || initialWatchedPoolId == bytes32(0)
                || initialOriginChainId == 0 || initialDestinationChainId == 0 || initialCallbackGasLimit < 100_000
        ) revert InvalidSource();

        poolManager = initialPoolManager;
        targetIntent = initialTargetIntent;
        watchedPoolId = initialWatchedPoolId;
        originChainId = initialOriginChainId;
        destinationChainId = initialDestinationChainId;
        callbackGasLimit = initialCallbackGasLimit;
        swapTopic0 = uint256(keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)"));

        if (!vm) {
            service.subscribe(
                originChainId,
                poolManager,
                swapTopic0,
                uint256(initialWatchedPoolId),
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    function react(LogRecord calldata logRecord) external vmOnly {
        if (logRecord.chain_id != originChainId || logRecord._contract != poolManager) revert InvalidSource();
        if (logRecord.topic_0 != swapTopic0 || logRecord.topic_1 != uint256(watchedPoolId)) revert InvalidLogRecord();

        bytes memory payload = _buildPayload(logRecord);
        emit Callback(destinationChainId, targetIntent, callbackGasLimit, payload);
    }

    function setCallbackGasLimit(uint64 newGasLimit) external onlyOwner {
        if (newGasLimit < 100_000) revert InvalidLogRecord();
        callbackGasLimit = newGasLimit;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function ownerAddress() external view returns (address) {
        return owner;
    }

    function previewPayload(LogRecord calldata logRecord) external view returns (bytes memory) {
        if (logRecord.topic_0 != swapTopic0 || logRecord.topic_1 != uint256(watchedPoolId)) revert InvalidLogRecord();
        return _buildPayload(logRecord);
    }

    function getPausableSubscriptions() internal view override returns (Subscription[] memory subscriptions) {
        subscriptions = new Subscription[](1);
        subscriptions[0] = Subscription(
            originChainId,
            poolManager,
            swapTopic0,
            uint256(watchedPoolId),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    function _buildPayload(LogRecord calldata logRecord) internal view returns (bytes memory) {
        (int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee) =
            abi.decode(logRecord.data, (int128, int128, uint160, uint128, int24, uint24));

        SwapCallbackData memory callbackData = SwapCallbackData({
            poolId: watchedPoolId,
            swapSender: _topicToAddress(logRecord.topic_2),
            amount0: amount0,
            amount1: amount1,
            sqrtPriceX96: sqrtPriceX96,
            liquidity: liquidity,
            tick: tick,
            fee: fee,
            originTxHash: logRecord.tx_hash
        });

        return _encodeCallbackPayload(callbackData);
    }

    function _encodeCallbackPayload(SwapCallbackData memory callbackData) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(
            IWillLeadReactiveFaucetIntent.callback.selector,
            address(0),
            callbackData.poolId,
            callbackData.swapSender,
            callbackData.amount0,
            callbackData.amount1,
            callbackData.sqrtPriceX96,
            callbackData.liquidity,
            callbackData.tick,
            callbackData.fee,
            callbackData.originTxHash
        );
    }

    function _topicToAddress(uint256 topic) internal pure returns (address) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(topic));
    }
}
