// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbstractPausableReactive} from "../lib/reactive-lib/src/abstract-base/AbstractPausableReactive.sol";
import {IWillLeadReactiveFaucetIntent} from "./interfaces/IWillLeadReactiveFaucetIntent.sol";

contract WillLeadMultiSourceSwapListener is AbstractPausableReactive {
    struct WatchedSource {
        address source;
        uint256 topic0;
        uint24 feeTag;
        bool useTopic1AsSender;
    }

    struct SwapCallbackData {
        bytes32 routeId;
        address swapSender;
        uint24 feeTag;
        uint256 originTxHash;
    }

    error InvalidSourceConfig();
    error UnsupportedLogRecord();

    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable targetIntent;
    bytes32 public immutable routeId;
    uint64 public callbackGasLimit;

    WatchedSource[] internal watchedSources;

    constructor(
        address[] memory initialSources,
        uint256[] memory initialTopic0s,
        uint24[] memory initialFeeTags,
        bool[] memory initialUseTopic1AsSender,
        address initialTargetIntent,
        bytes32 initialRouteId,
        uint256 initialOriginChainId,
        uint256 initialDestinationChainId,
        uint64 initialCallbackGasLimit
    ) payable {
        if (
            initialSources.length == 0 || initialSources.length != initialTopic0s.length
                || initialSources.length != initialFeeTags.length
                || initialSources.length != initialUseTopic1AsSender.length || initialTargetIntent == address(0)
                || initialRouteId == bytes32(0) || initialOriginChainId == 0 || initialDestinationChainId == 0
                || initialCallbackGasLimit < 100_000
        ) revert InvalidSourceConfig();

        targetIntent = initialTargetIntent;
        routeId = initialRouteId;
        originChainId = initialOriginChainId;
        destinationChainId = initialDestinationChainId;
        callbackGasLimit = initialCallbackGasLimit;

        for (uint256 i = 0; i < initialSources.length; i++) {
            if (initialSources[i] == address(0) || initialTopic0s[i] == 0) revert InvalidSourceConfig();

            watchedSources.push(
                WatchedSource({
                    source: initialSources[i],
                    topic0: initialTopic0s[i],
                    feeTag: initialFeeTags[i],
                    useTopic1AsSender: initialUseTopic1AsSender[i]
                })
            );

            if (!vm) {
                service.subscribe(
                    initialOriginChainId,
                    initialSources[i],
                    initialTopic0s[i],
                    REACTIVE_IGNORE,
                    REACTIVE_IGNORE,
                    REACTIVE_IGNORE
                );
            }
        }
    }

    function repairSubscriptions() external rnOnly onlyOwner {
        Subscription[] memory subscriptions = getPausableSubscriptions();
        for (uint256 i = 0; i < subscriptions.length; i++) {
            service.subscribe(
                subscriptions[i].chain_id,
                subscriptions[i]._contract,
                subscriptions[i].topic_0,
                subscriptions[i].topic_1,
                subscriptions[i].topic_2,
                subscriptions[i].topic_3
            );
        }
        paused = false;
    }

    function react(LogRecord calldata logRecord) external vmOnly {
        WatchedSource memory source = _resolveWatchedSource(logRecord);
        bytes memory payload = _encodeCallbackPayload(source, logRecord);
        emit Callback(destinationChainId, targetIntent, callbackGasLimit, payload);
    }

    function setCallbackGasLimit(uint64 newGasLimit) external onlyOwner {
        if (newGasLimit < 100_000) revert InvalidSourceConfig();
        callbackGasLimit = newGasLimit;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function ownerAddress() external view returns (address) {
        return owner;
    }

    function watchedSourceCount() external view returns (uint256) {
        return watchedSources.length;
    }

    function watchedPool() external view returns (address) {
        return watchedSources[0].source;
    }

    function swapTopic0() external view returns (uint256) {
        return watchedSources[0].topic0;
    }

    function watchedSourceAt(uint256 index)
        external
        view
        returns (address source, uint256 topic0, uint24 feeTag, bool useTopic1AsSender)
    {
        WatchedSource memory watchedSource = watchedSources[index];
        return (
            watchedSource.source,
            watchedSource.topic0,
            watchedSource.feeTag,
            watchedSource.useTopic1AsSender
        );
    }

    function previewPayload(LogRecord calldata logRecord) external view returns (bytes memory) {
        WatchedSource memory source = _resolveWatchedSource(logRecord);
        return _encodeCallbackPayload(source, logRecord);
    }

    function getPausableSubscriptions() internal view override returns (Subscription[] memory subscriptions) {
        subscriptions = new Subscription[](watchedSources.length);
        for (uint256 i = 0; i < watchedSources.length; i++) {
            subscriptions[i] = Subscription(
                originChainId,
                watchedSources[i].source,
                watchedSources[i].topic0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    function _resolveWatchedSource(LogRecord calldata logRecord) internal view returns (WatchedSource memory source) {
        if (logRecord.chain_id != originChainId) revert UnsupportedLogRecord();

        for (uint256 i = 0; i < watchedSources.length; i++) {
            if (logRecord._contract == watchedSources[i].source && logRecord.topic_0 == watchedSources[i].topic0) {
                return watchedSources[i];
            }
        }

        revert UnsupportedLogRecord();
    }

    function _encodeCallbackPayload(WatchedSource memory source, LogRecord calldata logRecord)
        internal
        view
        returns (bytes memory)
    {
        SwapCallbackData memory callbackData = SwapCallbackData({
            routeId: routeId,
            swapSender: source.useTopic1AsSender ? _topicToAddress(logRecord.topic_1) : address(0),
            feeTag: source.feeTag,
            originTxHash: logRecord.tx_hash
        });

        return abi.encodeWithSelector(
            IWillLeadReactiveFaucetIntent.callback.selector,
            address(0),
            callbackData.routeId,
            callbackData.swapSender,
            int128(0),
            int128(0),
            uint160(0),
            uint128(0),
            int24(0),
            callbackData.feeTag,
            callbackData.originTxHash
        );
    }

    function _topicToAddress(uint256 topic) internal pure returns (address) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(topic));
    }
}
