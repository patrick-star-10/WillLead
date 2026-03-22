// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadWallet} from "./WillLeadWallet.sol";

contract WillLeadWalletFactory {
    error InvalidConfig();

    event WalletCreated(
        address indexed owner,
        address indexed wallet,
        address indexed reactiveListener
    );

    address public immutable callbackProxy;
    address public immutable authorizedRvmId;
    address public immutable reactiveListener;
    address public immutable signalEmitter;
    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    uint256 public immutable strategySignalTopic0;

    mapping(address => address) public walletOf;
    mapping(address => address) public listenerOf;

    constructor(
        address initialCallbackProxy,
        address initialAuthorizedRvmId,
        address initialReactiveListener,
        address initialSignalEmitter,
        uint256 initialOriginChainId,
        uint256 initialDestinationChainId
    ) {
        if (
            initialCallbackProxy == address(0) || initialAuthorizedRvmId == address(0)
                || initialReactiveListener == address(0) || initialSignalEmitter == address(0)
                || initialOriginChainId == 0 || initialDestinationChainId == 0
        ) {
            revert InvalidConfig();
        }

        callbackProxy = initialCallbackProxy;
        authorizedRvmId = initialAuthorizedRvmId;
        reactiveListener = initialReactiveListener;
        signalEmitter = initialSignalEmitter;
        originChainId = initialOriginChainId;
        destinationChainId = initialDestinationChainId;
        strategySignalTopic0 =
            uint256(keccak256("StrategySignal(address,address,address,uint256,uint256,uint256)"));
    }

    function createWallet() external returns (address wallet) {
        wallet = walletOf[msg.sender];
        if (wallet != address(0)) {
            return wallet;
        }

        wallet = address(
            new WillLeadWallet(
                msg.sender,
                callbackProxy,
                authorizedRvmId,
                reactiveListener,
                signalEmitter,
                originChainId,
                destinationChainId
            )
        );
        walletOf[msg.sender] = wallet;
        listenerOf[wallet] = reactiveListener;

        emit WalletCreated(msg.sender, wallet, reactiveListener);
    }

    function getWalletContext(address owner)
        external
        view
        returns (
            address wallet,
            address listener,
            address emitter,
            uint256 sourceChain,
            uint256 targetChain,
            uint256 signalTopic0
        )
    {
        wallet = walletOf[owner];
        if (wallet == address(0)) {
            listener = reactiveListener;
            emitter = signalEmitter;
            sourceChain = originChainId;
            targetChain = destinationChainId;
            signalTopic0 = strategySignalTopic0;
            return (wallet, listener, emitter, sourceChain, targetChain, signalTopic0);
        }

        (listener, emitter, sourceChain, targetChain, signalTopic0) =
            WillLeadWallet(payable(wallet)).getRuntimeBinding();
    }
}
