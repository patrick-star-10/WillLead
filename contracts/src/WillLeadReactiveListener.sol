// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbstractPausableReactive} from "../lib/reactive-lib/src/abstract-base/AbstractPausableReactive.sol";
import {IWillLeadWallet} from "./interfaces/IWillLeadWallet.sol";

contract WillLeadReactiveListener is AbstractPausableReactive {
    error InvalidSource();
    error InvalidLogRecord();

    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable signalEmitter;
    uint64 public callbackGasLimit;
    uint256 public immutable strategySignalTopic0;

    constructor(
        address initialSignalEmitter,
        uint256 initialOriginChainId,
        uint256 initialDestinationChainId,
        uint64 initialCallbackGasLimit
    ) payable {
        if (initialSignalEmitter == address(0)) revert InvalidSource();

        signalEmitter = initialSignalEmitter;
        originChainId = initialOriginChainId;
        destinationChainId = initialDestinationChainId;
        callbackGasLimit = initialCallbackGasLimit;
        strategySignalTopic0 =
            uint256(keccak256("StrategySignal(address,address,address,uint256,uint256,uint256)"));

        if (!vm) {
            service.subscribe(
                originChainId,
                signalEmitter,
                strategySignalTopic0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    function react(LogRecord calldata logRecord) external vmOnly {
        if (logRecord.chain_id != originChainId || logRecord._contract != signalEmitter) {
            revert InvalidSource();
        }
        if (logRecord.topic_0 != strategySignalTopic0) revert InvalidLogRecord();

        address wallet = _topicToAddress(logRecord.topic_1);
        address token = _topicToAddress(logRecord.topic_2);
        address recipient = _topicToAddress(logRecord.topic_3);
        (uint256 amount, uint256 executionNonce, uint256 emittedAt) =
            abi.decode(logRecord.data, (uint256, uint256, uint256));

        bytes memory payload = abi.encodeWithSelector(
            IWillLeadWallet.callback.selector,
            address(0),
            token,
            recipient,
            amount,
            executionNonce,
            emittedAt,
            logRecord.tx_hash
        );

        emit Callback(destinationChainId, wallet, callbackGasLimit, payload);
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

    function getPausableSubscriptions() internal view override returns (Subscription[] memory subscriptions) {
        subscriptions = new Subscription[](1);
        subscriptions[0] = Subscription(
            originChainId,
            signalEmitter,
            strategySignalTopic0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    function previewPayload(LogRecord calldata logRecord) external view returns (bytes memory) {
        if (logRecord.topic_0 != strategySignalTopic0) revert InvalidLogRecord();

        address token = _topicToAddress(logRecord.topic_2);
        address recipient = _topicToAddress(logRecord.topic_3);
        (uint256 amount, uint256 executionNonce, uint256 emittedAt) =
            abi.decode(logRecord.data, (uint256, uint256, uint256));

        return abi.encodeWithSelector(
            IWillLeadWallet.callback.selector,
            address(0),
            token,
            recipient,
            amount,
            executionNonce,
            emittedAt,
            logRecord.tx_hash
        );
    }

    function _topicToAddress(uint256 topic) internal pure returns (address) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(uint256(topic)));
    }
}
