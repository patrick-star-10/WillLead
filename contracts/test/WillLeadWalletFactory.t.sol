// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadWalletFactory} from "../src/WillLeadWalletFactory.sol";
import {WillLeadWallet} from "../src/WillLeadWallet.sol";

contract WalletFactoryCaller {
    function create(WillLeadWalletFactory factory) external returns (address) {
        return factory.createWallet();
    }

    function configureRuntimeRoute(
        WillLeadWallet wallet,
        address listener,
        address emitter,
        uint256 sourceChain,
        uint256 destinationChain,
        uint256 topic0
    ) external {
        wallet.configureRuntimeRoute(listener, emitter, sourceChain, destinationChain, topic0);
    }
}

contract WillLeadWalletFactoryTest {
    address internal constant CALLBACK_PROXY = address(0xC0FFEE);
    address internal constant AUTHORIZED_RVM_ID = address(0xB0B);
    address internal constant REACTIVE_LISTENER = address(0x157);
    address internal constant SIGNAL_EMITTER = address(0x51A6);
    address internal constant ALT_LISTENER = address(0x1717);
    address internal constant ALT_SIGNAL_EMITTER = address(0x7171);
    uint256 internal constant ORIGIN_CHAIN_ID = 84532;
    uint256 internal constant DESTINATION_CHAIN_ID = 11155111;
    uint256 internal constant ALT_ORIGIN_CHAIN_ID = 421614;
    uint256 internal constant ALT_STRATEGY_SIGNAL_TOPIC0 = 987654321;

    function testWalletContextIncludesRuntimeRoute() public {
        WillLeadWalletFactory factory = _deployFactory();
        WalletFactoryCaller caller = new WalletFactoryCaller();

        address wallet = caller.create(factory);
        (
            address contextWallet,
            address listener,
            address emitter,
            uint256 sourceChain,
            uint256 targetChain,
            uint256 signalTopic0
        ) = factory.getWalletContext(address(caller));

        require(contextWallet == wallet, "wallet should match");
        require(listener == REACTIVE_LISTENER, "listener should match");
        require(emitter == SIGNAL_EMITTER, "emitter should match");
        require(sourceChain == ORIGIN_CHAIN_ID, "origin chain should match");
        require(targetChain == DESTINATION_CHAIN_ID, "destination chain should match");
        require(signalTopic0 == factory.strategySignalTopic0(), "topic0 should match");
    }

    function testCreatedWalletReceivesRuntimeBinding() public {
        WillLeadWalletFactory factory = _deployFactory();
        WalletFactoryCaller caller = new WalletFactoryCaller();
        address walletAddress = caller.create(factory);
        WillLeadWallet wallet = WillLeadWallet(payable(walletAddress));

        (
            address listener,
            address emitter,
            uint256 sourceChain,
            uint256 targetChain,
            uint256 signalTopic0
        ) = wallet.getRuntimeBinding();

        require(listener == REACTIVE_LISTENER, "wallet listener should match");
        require(emitter == SIGNAL_EMITTER, "wallet emitter should match");
        require(sourceChain == ORIGIN_CHAIN_ID, "wallet origin chain should match");
        require(targetChain == DESTINATION_CHAIN_ID, "wallet destination chain should match");
        require(signalTopic0 == factory.strategySignalTopic0(), "wallet topic0 should match");
    }

    function testWalletContextReflectsUpdatedRuntimeRoute() public {
        WillLeadWalletFactory factory = _deployFactory();
        WalletFactoryCaller caller = new WalletFactoryCaller();
        address walletAddress = caller.create(factory);
        WillLeadWallet wallet = WillLeadWallet(payable(walletAddress));

        caller.configureRuntimeRoute(
            wallet,
            ALT_LISTENER, ALT_SIGNAL_EMITTER, ALT_ORIGIN_CHAIN_ID, DESTINATION_CHAIN_ID, ALT_STRATEGY_SIGNAL_TOPIC0
        );

        (
            address contextWallet,
            address listener,
            address emitter,
            uint256 sourceChain,
            uint256 targetChain,
            uint256 signalTopic0
        ) = factory.getWalletContext(address(caller));

        require(contextWallet == walletAddress, "wallet should still match");
        require(listener == ALT_LISTENER, "listener should follow wallet binding");
        require(emitter == ALT_SIGNAL_EMITTER, "emitter should follow wallet binding");
        require(sourceChain == ALT_ORIGIN_CHAIN_ID, "origin chain should follow wallet binding");
        require(targetChain == DESTINATION_CHAIN_ID, "destination chain should remain set");
        require(signalTopic0 == ALT_STRATEGY_SIGNAL_TOPIC0, "topic0 should follow wallet binding");
    }

    function _deployFactory() internal returns (WillLeadWalletFactory factory) {
        factory = new WillLeadWalletFactory(
            CALLBACK_PROXY,
            AUTHORIZED_RVM_ID,
            REACTIVE_LISTENER,
            SIGNAL_EMITTER,
            ORIGIN_CHAIN_ID,
            DESTINATION_CHAIN_ID
        );
    }
}
