// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadRoutePoolSwapListener} from "../src/WillLeadRoutePoolSwapListener.sol";
import {IReactive} from "../lib/reactive-lib/src/interfaces/IReactive.sol";

contract WillLeadRoutePoolSwapListenerTest {
    address internal constant POOL = address(0x6418);
    address internal constant TARGET_INTENT = address(0xBEEF);
    uint24 internal constant POOL_FEE = 10_000;
    bytes32 internal constant ROUTE_ID = keccak256("weth-usdc-v3-route");

    function testPreviewPayloadEncodesSharedRouteIdForTargetIntent() public {
        WillLeadRoutePoolSwapListener listener =
            new WillLeadRoutePoolSwapListener(POOL, TARGET_INTENT, ROUTE_ID, POOL_FEE, 11155111, 11155111, 500_000);

        IReactive.LogRecord memory logRecord = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: POOL,
            topic_0: listener.swapTopic0(),
            topic_1: uint256(uint160(address(0xA11CE))),
            topic_2: uint256(uint160(address(0xCAFE))),
            topic_3: 0,
            data: abi.encode(int256(-1e16), int256(123_456), uint160(100), uint128(200), int24(10)),
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
            address(0xA11CE),
            int128(-1e16),
            int128(123_456),
            uint160(100),
            uint128(200),
            int24(10),
            uint24(POOL_FEE),
            uint256(12345)
        );

        require(keccak256(payload) == keccak256(expected), "payload should match callback encoding");
        require(listener.watchedPool() == POOL, "pool should match");
        require(listener.watchedPoolId() == ROUTE_ID, "route should match");
        require(listener.poolFee() == POOL_FEE, "fee should match");
    }
}
