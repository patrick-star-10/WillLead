// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadSignalEmitter} from "../src/WillLeadSignalEmitter.sol";

contract NonOperatorSyncCaller {
    function attemptSync(
        WillLeadSignalEmitter emitter,
        address wallet,
        address token,
        address recipient,
        uint256 amountPerExecution,
        uint256 maxExecutions,
        bool active
    ) external {
        emitter.syncIntent(wallet, token, recipient, amountPerExecution, maxExecutions, active);
    }
}

contract WillLeadSignalEmitterTest {
    address internal constant WALLET = address(0xA11CE);
    address internal constant TOKEN = address(0);
    address internal constant RECIPIENT = address(0xCAFE);

    function testSyncIntentStoresMirroredIntentAndAllowsPoke() public {
        WillLeadSignalEmitter emitter = new WillLeadSignalEmitter(address(this));

        emitter.syncIntent(WALLET, TOKEN, RECIPIENT, 1 ether, 3, true);

        (
            bool active,
            address token,
            address recipient,
            uint256 amountPerExecution,
            uint256 maxExecutions
        ) = emitter.mirroredIntentOf(WALLET);

        require(active, "intent should be active");
        require(token == TOKEN, "token should match");
        require(recipient == RECIPIENT, "recipient should match");
        require(amountPerExecution == 1 ether, "amount should match");
        require(maxExecutions == 3, "max executions should match");

        (bool ok,) = address(emitter).call(
            abi.encodeWithSelector(emitter.poke.selector, WALLET, 1)
        );
        require(ok, "poke should succeed for mirrored active intent");
    }

    function testSyncIntentCanDisableMirroredIntent() public {
        WillLeadSignalEmitter emitter = new WillLeadSignalEmitter(address(this));

        emitter.syncIntent(WALLET, TOKEN, RECIPIENT, 1 ether, 3, false);

        (bool ok,) = address(emitter).call(
            abi.encodeWithSelector(emitter.poke.selector, WALLET, 1)
        );
        require(!ok, "poke should fail for inactive mirrored intent");
    }

    function testOnlyOperatorCanSyncIntent() public {
        WillLeadSignalEmitter emitter = new WillLeadSignalEmitter(address(this));
        NonOperatorSyncCaller caller = new NonOperatorSyncCaller();

        (bool ok,) = address(caller).call(
            abi.encodeWithSelector(
                caller.attemptSync.selector,
                emitter,
                WALLET,
                TOKEN,
                RECIPIENT,
                1 ether,
                3,
                true
            )
        );

        require(!ok, "non-operator should not sync mirrored intent");
    }
}
