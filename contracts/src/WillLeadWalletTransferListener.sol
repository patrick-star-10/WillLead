// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbstractPausableReactive} from "../lib/reactive-lib/src/abstract-base/AbstractPausableReactive.sol";
import {IWillLeadReactiveFaucetIntent} from "./interfaces/IWillLeadReactiveFaucetIntent.sol";

contract WillLeadWalletTransferListener is AbstractPausableReactive {
    error InvalidSourceConfig();
    error InvalidLogRecord();

    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable watchedPool;
    address public immutable watchedWalletAddress;
    address public immutable targetIntent;
    bytes32 public immutable watchedPoolId;
    uint64 public callbackGasLimit;
    uint256 public immutable swapTopic0;
    bool public immutable watchIncoming;
    bool public immutable watchOutgoing;

    constructor(
        address initialWatchedToken,
        address initialWatchedWallet,
        address initialTargetIntent,
        bytes32 initialRouteId,
        uint256 initialOriginChainId,
        uint256 initialDestinationChainId,
        uint64 initialCallbackGasLimit,
        bool initialWatchIncoming,
        bool initialWatchOutgoing
    ) payable {
        if (
            initialWatchedToken == address(0) || initialWatchedWallet == address(0) || initialTargetIntent == address(0)
                || initialRouteId == bytes32(0) || initialOriginChainId == 0 || initialDestinationChainId == 0
                || initialCallbackGasLimit < 100_000 || (!initialWatchIncoming && !initialWatchOutgoing)
        ) revert InvalidSourceConfig();

        watchedPool = initialWatchedToken;
        watchedWalletAddress = initialWatchedWallet;
        targetIntent = initialTargetIntent;
        watchedPoolId = initialRouteId;
        originChainId = initialOriginChainId;
        destinationChainId = initialDestinationChainId;
        callbackGasLimit = initialCallbackGasLimit;
        watchIncoming = initialWatchIncoming;
        watchOutgoing = initialWatchOutgoing;
        swapTopic0 = uint256(keccak256("Transfer(address,address,uint256)"));

        if (!vm) {
            _subscribeAll();
        }
    }

    function react(LogRecord calldata logRecord) external vmOnly {
        if (logRecord.chain_id != originChainId || logRecord._contract != watchedPool) revert InvalidSourceConfig();
        if (logRecord.topic_0 != swapTopic0) revert InvalidLogRecord();

        bool matchesIncoming = watchIncoming && _topicToAddress(logRecord.topic_2) == watchedWalletAddress;
        bool matchesOutgoing = watchOutgoing && _topicToAddress(logRecord.topic_1) == watchedWalletAddress;
        if (!matchesIncoming && !matchesOutgoing) revert InvalidLogRecord();

        emit Callback(destinationChainId, targetIntent, callbackGasLimit, _buildPayload(logRecord));
    }

    function repairSubscriptions() external rnOnly onlyOwner {
        _subscribeAll();
        paused = false;
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

    function previewPayload(LogRecord calldata logRecord) external view returns (bytes memory) {
        if (logRecord.topic_0 != swapTopic0) revert InvalidLogRecord();
        return _buildPayload(logRecord);
    }

    function getPausableSubscriptions() internal view override returns (Subscription[] memory subscriptions) {
        uint256 count = (watchIncoming ? 1 : 0) + (watchOutgoing ? 1 : 0);
        subscriptions = new Subscription[](count);

        uint256 index = 0;
        if (watchIncoming) {
            subscriptions[index] = Subscription(
                originChainId,
                watchedPool,
                swapTopic0,
                REACTIVE_IGNORE,
                uint256(uint160(watchedWalletAddress)),
                REACTIVE_IGNORE
            );
            index += 1;
        }

        if (watchOutgoing) {
            subscriptions[index] = Subscription(
                originChainId,
                watchedPool,
                swapTopic0,
                uint256(uint160(watchedWalletAddress)),
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    function _subscribeAll() internal {
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
    }

    function _buildPayload(LogRecord calldata logRecord) internal view returns (bytes memory) {
        address swapSender = watchedWalletAddress;
        return abi.encodeWithSelector(
            IWillLeadReactiveFaucetIntent.callback.selector,
            address(0),
            watchedPoolId,
            swapSender,
            int128(0),
            int128(0),
            uint160(0),
            uint128(0),
            int24(0),
            uint24(0),
            logRecord.tx_hash
        );
    }

    function _topicToAddress(uint256 topic) internal pure returns (address) {
        return address(uint160(topic));
    }
}
