// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "../interfaces/IReactive.sol";
import "./AbstractReactive.sol";

abstract contract AbstractPausableReactive is IReactive, AbstractReactive {
    struct Subscription {
        uint256 chain_id;
        address _contract;
        uint256 topic_0;
        uint256 topic_1;
        uint256 topic_2;
        uint256 topic_3;
    }

    address internal owner;
    bool internal paused;

    constructor() {
        owner = msg.sender;
    }

    function getPausableSubscriptions() internal view virtual returns (Subscription[] memory);

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    function pause() external rnOnly onlyOwner {
        require(!paused, "Already paused");
        Subscription[] memory subscriptions = getPausableSubscriptions();
        for (uint256 i = 0; i < subscriptions.length; i++) {
            service.unsubscribe(
                subscriptions[i].chain_id,
                subscriptions[i]._contract,
                subscriptions[i].topic_0,
                subscriptions[i].topic_1,
                subscriptions[i].topic_2,
                subscriptions[i].topic_3
            );
        }
        paused = true;
    }

    function resume() external rnOnly onlyOwner {
        require(paused, "Not paused");
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
}

