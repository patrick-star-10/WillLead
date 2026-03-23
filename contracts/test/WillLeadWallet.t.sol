// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadWallet} from "../src/WillLeadWallet.sol";

contract MockReactiveFaucet {
    address public lastRecipient;
    uint256 public lastValue;
    uint256 public requestCount;
    bool public shouldRevert;

    function setShouldRevert(bool nextShouldRevert) external {
        shouldRevert = nextShouldRevert;
    }

    function request(address recipient) external payable {
        require(!shouldRevert, "mock faucet revert");
        lastRecipient = recipient;
        lastValue = msg.value;
        requestCount += 1;
    }
}

contract WillLeadWalletTest {
    address internal constant AUTHORIZED_RVM_ID = address(0xB0B);
    address internal constant LISTENER = address(0x157);
    address internal constant SIGNAL_EMITTER = address(0x51A6);
    address internal constant ALT_LISTENER = address(0x1717);
    address internal constant ALT_SIGNAL_EMITTER = address(0x7171);
    address internal constant SWAP_LISTENER = address(0x5A17);
    address internal constant POOL_MANAGER = address(0x5050);
    bytes32 internal constant SWAP_ROUTE_ID = bytes32(uint256(0x1234));
    address internal constant SWAP_SENDER = address(0xA11CE);
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

    function testSwapCallbackRequestsFaucetUsingWalletBalance() public {
        WillLeadWallet wallet = _deployWallet();
        MockReactiveFaucet faucet = new MockReactiveFaucet();

        wallet.configureSwapRuntimeRoute(
            SWAP_LISTENER,
            POOL_MANAGER,
            SWAP_ROUTE_ID,
            DESTINATION_CHAIN_ID,
            DESTINATION_CHAIN_ID,
            uint256(keccak256("Swap(address,address,int256,int256,uint160,uint128,int24)"))
        );
        wallet.configureSwapIntent(address(faucet), RECIPIENT, 0.1 ether, 2);
        _fundWallet(address(wallet), 1 ether);

        wallet.callback(AUTHORIZED_RVM_ID, SWAP_ROUTE_ID, SWAP_SENDER, -1, 1, 100, 200, 10, 500, 12345);

        (, , , , , uint256 executedCount) = wallet.getSwapIntentSummary();
        require(executedCount == 1, "expected swap execution count");
        require(faucet.requestCount() == 1, "expected faucet request");
        require(faucet.lastRecipient() == RECIPIENT, "expected lreact recipient");
        require(faucet.lastValue() == 0.1 ether, "expected request value");
        require(wallet.lastSwapOriginTxHash() == 12345, "expected origin tx hash");
        require(wallet.lastSwapExecutedAt() != 0, "expected executed timestamp");
    }

    function testSwapIntentReconfigureResetsRuntimeHistory() public {
        WillLeadWallet wallet = _deployWallet();
        MockReactiveFaucet faucet = new MockReactiveFaucet();

        wallet.configureSwapRuntimeRoute(
            SWAP_LISTENER,
            POOL_MANAGER,
            SWAP_ROUTE_ID,
            DESTINATION_CHAIN_ID,
            DESTINATION_CHAIN_ID,
            uint256(keccak256("Swap(address,address,int256,int256,uint160,uint128,int24)"))
        );
        wallet.configureSwapIntent(address(faucet), RECIPIENT, 0.1 ether, 1);
        _fundWallet(address(wallet), 1 ether);
        wallet.callback(AUTHORIZED_RVM_ID, SWAP_ROUTE_ID, SWAP_SENDER, -1, 1, 100, 200, 10, 500, 12345);

        wallet.configureSwapIntent(address(faucet), RECIPIENT, 0.2 ether, 3);

        (
            WillLeadWallet.RuntimeStatus status,
            address configuredFaucet,
            address lreactRecipient,
            uint256 requestValue,
            uint256 maxExecutions,
            uint256 executedCount
        ) = wallet.getSwapIntentSummary();

        require(status == WillLeadWallet.RuntimeStatus.Active, "swap runtime should reset to active");
        require(configuredFaucet == address(faucet), "faucet should remain configured");
        require(lreactRecipient == RECIPIENT, "recipient should remain configured");
        require(requestValue == 0.2 ether, "request value should update");
        require(maxExecutions == 3, "max executions should update");
        require(executedCount == 0, "executed count should reset");
        require(wallet.lastSwapOriginTxHash() == 0, "last swap origin tx should reset");
        require(wallet.lastSwapExecutedAt() == 0, "last swap executed timestamp should reset");
        require(wallet.lastSwapCallbackHash() == bytes32(0), "last swap callback hash should reset");
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
