// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbstractPausableReactive} from "../lib/reactive-lib/src/abstract-base/AbstractPausableReactive.sol";
import {IWillLeadSwapCallbackTarget} from "./interfaces/IWillLeadSwapCallbackTarget.sol";

contract WillLeadPoolSwapListener is AbstractPausableReactive {
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
    error InvalidSwapAmount();

    uint256 internal constant INT128_MIN_ABS = 1 << 127;
    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable watchedPool;
    address public immutable targetIntent;
    bytes32 public immutable watchedPoolId;
    uint24 public immutable poolFee;
    uint64 public callbackGasLimit;
    uint256 public immutable swapTopic0;

    constructor(
        address initialWatchedPool,
        address initialTargetIntent,
        uint24 initialPoolFee,
        uint256 initialOriginChainId,
        uint256 initialDestinationChainId,
        uint64 initialCallbackGasLimit
    ) payable {
        if (
            initialWatchedPool == address(0) || initialTargetIntent == address(0) || initialOriginChainId == 0
                || initialDestinationChainId == 0 || initialCallbackGasLimit < 100_000
        ) revert InvalidSource();

        watchedPool = initialWatchedPool;
        targetIntent = initialTargetIntent;
        watchedPoolId = bytes32(uint256(uint160(initialWatchedPool)));
        poolFee = initialPoolFee;
        originChainId = initialOriginChainId;
        destinationChainId = initialDestinationChainId;
        callbackGasLimit = initialCallbackGasLimit;
        swapTopic0 = uint256(keccak256("Swap(address,address,int256,int256,uint160,uint128,int24)"));

        if (!vm) {
            service.subscribe(
                originChainId,
                watchedPool,
                swapTopic0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    function react(LogRecord calldata logRecord) external vmOnly {
        if (logRecord.chain_id != originChainId || logRecord._contract != watchedPool) revert InvalidSource();
        if (logRecord.topic_0 != swapTopic0) revert InvalidLogRecord();

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
        if (logRecord.topic_0 != swapTopic0) revert InvalidLogRecord();
        return _buildPayload(logRecord);
    }

    function getPausableSubscriptions() internal view override returns (Subscription[] memory subscriptions) {
        subscriptions = new Subscription[](1);
        subscriptions[0] = Subscription(
            originChainId,
            watchedPool,
            swapTopic0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    function _buildPayload(LogRecord calldata logRecord) internal view returns (bytes memory) {
        (int256 rawAmount0, int256 rawAmount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick) =
            abi.decode(logRecord.data, (int256, int256, uint160, uint128, int24));

        SwapCallbackData memory callbackData = SwapCallbackData({
            poolId: watchedPoolId,
            swapSender: _topicToAddress(logRecord.topic_1),
            amount0: _toInt128(rawAmount0),
            amount1: _toInt128(rawAmount1),
            sqrtPriceX96: sqrtPriceX96,
            liquidity: liquidity,
            tick: tick,
            fee: poolFee,
            originTxHash: logRecord.tx_hash
        });

        return _encodeCallbackPayload(callbackData);
    }

    function _encodeCallbackPayload(SwapCallbackData memory callbackData) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(
            IWillLeadSwapCallbackTarget.callback.selector,
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

    function _toInt128(int256 value) internal pure returns (int128) {
        // forge-lint: disable-next-line(unsafe-typecast)
        if (value > type(int128).max || value < -int256(INT128_MIN_ABS)) revert InvalidSwapAmount();
        // forge-lint: disable-next-line(unsafe-typecast)
        return int128(value);
    }

    function _topicToAddress(uint256 topic) internal pure returns (address) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(topic));
    }
}
