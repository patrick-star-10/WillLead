// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadWallet} from "../src/WillLeadWallet.sol";

contract WillLeadWalletTest {
    address internal constant AUTHORIZED_RVM_ID = address(0xB0B);
    address internal constant LISTENER = address(0x157);
    address internal constant SIGNAL_EMITTER = address(0x51A6);
    address internal constant ALT_LISTENER = address(0x1717);
    address internal constant ALT_SIGNAL_EMITTER = address(0x7171);
    uint256 internal constant ORIGIN_CHAIN_ID = 84532;
    uint256 internal constant DESTINATION_CHAIN_ID = 11155111;
    uint256 internal constant ALT_ORIGIN_CHAIN_ID = 421614;
    uint256 internal constant ALT_STRATEGY_SIGNAL_TOPIC0 = 123456789;
    address payable internal constant RECIPIENT = payable(address(0xCAFE));

    receive() external payable {}

    function testReconfigureIntentResetsRuntimeHistory() public {
        WillLeadWallet wallet = _deployWallet();
        _fundWallet(address(wallet), 5 ether);

        _configureIntent(wallet, 5);
        wallet.callback(AUTHORIZED_RVM_ID, address(0), RECIPIENT, 1 ether, 1, 100, 111);

        (, , , , , uint256 executedCountBefore) = wallet.intent();

        require(wallet.lastExecutionNonce() == 1, "expected nonce before reconfigure");
        require(executedCountBefore == 1, "expected executed count before reconfigure");
        require(wallet.lastExecutedAt() != 0, "expected executed timestamp before reconfigure");
        require(wallet.lastSignalHash() != bytes32(0), "expected signal hash before reconfigure");

        _configureIntent(wallet, 3);

        (
            bool enabled,
            address token,
            address recipient,
            uint256 amountPerExecution,
            uint256 maxExecutions,
            uint256 executedCount
        ) = wallet.intent();

        require(enabled, "intent should stay enabled");
        require(token == address(0), "token should remain native");
        require(recipient == RECIPIENT, "recipient should be updated");
        require(amountPerExecution == 1 ether, "amount should remain fixed");
        require(maxExecutions == 3, "max executions should update");
        require(executedCount == 0, "executed count should reset");
        require(wallet.lastExecutionNonce() == 0, "execution nonce should reset");
        require(wallet.lastExecutedAt() == 0, "last executed timestamp should reset");
        require(wallet.lastSignalHash() == bytes32(0), "signal hash should reset");
    }

    function testReconfigureIntentAllowsFreshNonceSequence() public {
        WillLeadWallet wallet = _deployWallet();
        _fundWallet(address(wallet), 5 ether);

        _configureIntent(wallet, 5);
        wallet.callback(AUTHORIZED_RVM_ID, address(0), RECIPIENT, 1 ether, 1, 100, 111);

        uint256 recipientBalanceBefore = RECIPIENT.balance;

        _configureIntent(wallet, 3);
        wallet.callback(AUTHORIZED_RVM_ID, address(0), RECIPIENT, 1 ether, 1, 200, 222);

        (, , , , , uint256 executedCountAfter) = wallet.intent();

        require(wallet.lastExecutionNonce() == 1, "new plan should accept nonce one");
        require(executedCountAfter == 1, "new plan should track first execution");
        require(RECIPIENT.balance == recipientBalanceBefore + 1 ether, "recipient should receive transfer");
    }

    function testRuntimeBindingIsPartOfWalletState() public {
        WillLeadWallet wallet = _deployWallet();

        (
            address listener,
            address signalEmitter,
            uint256 sourceChainId,
            uint256 destinationChainId,
            uint256 strategySignalTopic0
        ) = wallet.getRuntimeBinding();

        require(listener == LISTENER, "listener should match");
        require(signalEmitter == SIGNAL_EMITTER, "signal emitter should match");
        require(sourceChainId == ORIGIN_CHAIN_ID, "source chain should match");
        require(destinationChainId == DESTINATION_CHAIN_ID, "destination chain should match");
        require(strategySignalTopic0 != 0, "strategy topic should be set");
    }

    function testOwnerCanReconfigureRuntimeBinding() public {
        WillLeadWallet wallet = _deployWallet();

        wallet.configureRuntimeRoute(
            ALT_LISTENER, ALT_SIGNAL_EMITTER, ALT_ORIGIN_CHAIN_ID, DESTINATION_CHAIN_ID, ALT_STRATEGY_SIGNAL_TOPIC0
        );

        (
            address listener,
            address signalEmitter,
            uint256 sourceChainId,
            uint256 destinationChainId,
            uint256 strategySignalTopic0
        ) = wallet.getRuntimeBinding();

        require(listener == ALT_LISTENER, "listener should update");
        require(signalEmitter == ALT_SIGNAL_EMITTER, "signal emitter should update");
        require(sourceChainId == ALT_ORIGIN_CHAIN_ID, "source chain should update");
        require(destinationChainId == DESTINATION_CHAIN_ID, "destination chain should remain set");
        require(strategySignalTopic0 == ALT_STRATEGY_SIGNAL_TOPIC0, "topic0 should update");
    }

    function _deployWallet() internal returns (WillLeadWallet wallet) {
        wallet = new WillLeadWallet(
            address(this),
            address(this),
            AUTHORIZED_RVM_ID,
            LISTENER,
            SIGNAL_EMITTER,
            ORIGIN_CHAIN_ID,
            DESTINATION_CHAIN_ID
        );
    }

    function _configureIntent(WillLeadWallet wallet, uint256 maxExecutions) internal {
        (bool ok,) = address(wallet).call(
            abi.encodeWithSelector(
                wallet.configureIntent.selector,
                address(0),
                RECIPIENT,
                1 ether,
                maxExecutions,
                0.1 ether
            )
        );
        require(ok, "configure intent failed");
    }

    function _fundWallet(address wallet, uint256 amount) internal {
        (bool ok,) = payable(wallet).call{value: amount}("");
        require(ok, "fund wallet failed");
    }
}
