// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadWalletTransferListener} from "../src/WillLeadWalletTransferListener.sol";
import {IReactive} from "../lib/reactive-lib/src/interfaces/IReactive.sol";

contract WillLeadWalletTransferListenerTest {
    address internal constant TOKEN = address(0x1c7D);
    address internal constant WATCHED_WALLET = address(0xA11CE);
    address internal constant TARGET_INTENT = address(0xBEEF);
    bytes32 internal constant ROUTE_ID = keccak256("wallet-transfer-route");

    function testPreviewPayloadEncodesCallbackForIncomingTransfer() public {
        WillLeadWalletTransferListener listener = new WillLeadWalletTransferListener(
            TOKEN,
            WATCHED_WALLET,
            TARGET_INTENT,
            ROUTE_ID,
            11155111,
            11155111,
            500_000,
            true,
            false
        );

        IReactive.LogRecord memory logRecord = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: TOKEN,
            topic_0: listener.swapTopic0(),
            topic_1: uint256(uint160(address(0xCAFE))),
            topic_2: uint256(uint160(WATCHED_WALLET)),
            topic_3: 0,
            data: abi.encode(uint256(123_456)),
            block_number: 1,
            op_code: 0,
            block_hash: 0,
            tx_hash: 12345,
            log_index: 0
        });

        bytes memory payload = listener.previewPayload(logRecord);
        bytes memory expected = abi.encodeWithSignature(
            "callback(address,bytes32,address,int128,int128,uint160,uint128,int24,uint24,uint256)",
            address(0),
            ROUTE_ID,
            WATCHED_WALLET,
            int128(0),
            int128(0),
            uint160(0),
            uint128(0),
            int24(0),
            uint24(0),
            uint256(12345)
        );

        require(keccak256(payload) == keccak256(expected), "payload should match callback encoding");
        require(listener.watchedPool() == TOKEN, "token should match");
        require(listener.watchedWalletAddress() == WATCHED_WALLET, "wallet should match");
        require(listener.watchedPoolId() == ROUTE_ID, "route id should match");
    }
}
