// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadUniswapV4SwapListener} from "../src/WillLeadUniswapV4SwapListener.sol";
import {IReactive} from "../lib/reactive-lib/src/interfaces/IReactive.sol";

contract WillLeadUniswapV4SwapListenerTest {
    address internal constant POOL_MANAGER = address(0x5050);
    address internal constant TARGET_INTENT = address(0xBEEF);
    bytes32 internal constant POOL_ID = bytes32(uint256(0x1234));

    function testPreviewPayloadEncodesSwapCallbackForTargetIntent() public {
        WillLeadUniswapV4SwapListener listener =
            new WillLeadUniswapV4SwapListener(POOL_MANAGER, TARGET_INTENT, POOL_ID, 11155111, 11155111, 500_000);

        IReactive.LogRecord memory logRecord = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: POOL_MANAGER,
            topic_0: listener.swapTopic0(),
            topic_1: uint256(POOL_ID),
            topic_2: uint256(uint160(address(0xA11CE))),
            topic_3: 0,
            data: abi.encode(int128(-1), int128(1), uint160(100), uint128(200), int24(10), uint24(500)),
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
            POOL_ID,
            address(0xA11CE),
            int128(-1),
            int128(1),
            uint160(100),
            uint128(200),
            int24(10),
            uint24(500),
            uint256(12345)
        );

        require(keccak256(payload) == keccak256(expected), "payload should match callback encoding");
        require(listener.targetIntent() == TARGET_INTENT, "target intent should match");
        require(listener.watchedPoolId() == POOL_ID, "pool id should match");
    }
}
