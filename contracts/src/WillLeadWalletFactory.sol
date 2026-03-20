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

    mapping(address => address) public walletOf;
    mapping(address => address) public listenerOf;

    constructor(
        address initialCallbackProxy,
        address initialAuthorizedRvmId,
        address initialReactiveListener,
        address initialSignalEmitter
    ) {
        if (
            initialCallbackProxy == address(0) || initialAuthorizedRvmId == address(0)
                || initialReactiveListener == address(0) || initialSignalEmitter == address(0)
        ) {
            revert InvalidConfig();
        }

        callbackProxy = initialCallbackProxy;
        authorizedRvmId = initialAuthorizedRvmId;
        reactiveListener = initialReactiveListener;
        signalEmitter = initialSignalEmitter;
    }

    function createWallet() external returns (address wallet) {
        wallet = walletOf[msg.sender];
        if (wallet != address(0)) {
            return wallet;
        }

        wallet = address(new WillLeadWallet(msg.sender, callbackProxy, authorizedRvmId));
        walletOf[msg.sender] = wallet;
        listenerOf[wallet] = reactiveListener;

        emit WalletCreated(msg.sender, wallet, reactiveListener);
    }

    function getWalletContext(address owner)
        external
        view
        returns (address wallet, address listener, address emitter)
    {
        wallet = walletOf[owner];
        listener = reactiveListener;
        emitter = signalEmitter;
    }
}
