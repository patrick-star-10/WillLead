// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadMultiSourceSwapListener} from "../src/WillLeadMultiSourceSwapListener.sol";
import {IReactive} from "../lib/reactive-lib/src/interfaces/IReactive.sol";

contract WillLeadMultiSourceSwapListenerTest {
    address internal constant V3_POOL = address(0x6418);
    address internal constant V2_POOL = address(0x3289);
    address internal constant TARGET_INTENT = address(0xBEEF);
    bytes32 internal constant ROUTE_ID = keccak256("WETH-USDC-DEMO-ROUTE");
    uint256 internal constant V3_SWAP_TOPIC0 =
        uint256(keccak256("Swap(address,address,int256,int256,uint160,uint128,int24)"));
    uint256 internal constant V2_SWAP_TOPIC0 =
        uint256(keccak256("Swap(address,uint256,uint256,uint256,uint256,address)"));

    function testPreviewPayloadNormalizesV3SwapIntoStableRoute() public {
        WillLeadMultiSourceSwapListener listener = _deployListener();

        IReactive.LogRecord memory logRecord = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: V3_POOL,
            topic_0: V3_SWAP_TOPIC0,
            topic_1: uint256(uint160(address(0xA11CE))),
            topic_2: uint256(uint160(address(0xCAFE))),
            topic_3: 0,
            data: hex"",
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
            int128(0),
            int128(0),
            uint160(0),
            uint128(0),
            int24(0),
            uint24(10_000),
            uint256(12345)
        );

        require(keccak256(payload) == keccak256(expected), "v3 payload should normalize");
    }

    function testPreviewPayloadNormalizesV2SwapIntoSameRoute() public {
        WillLeadMultiSourceSwapListener listener = _deployListener();

        IReactive.LogRecord memory logRecord = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: V2_POOL,
            topic_0: V2_SWAP_TOPIC0,
            topic_1: uint256(uint160(address(0xB0B))),
            topic_2: 0,
            topic_3: 0,
            data: hex"",
            block_number: 1,
            op_code: 0,
            block_hash: 0,
            tx_hash: 67890,
            log_index: 0
        });

        bytes memory payload = listener.previewPayload(logRecord);
        bytes memory expected = abi.encodeWithSignature(
            "callback(address,bytes32,address,int128,int128,uint160,uint128,int24,uint24,uint256)",
            address(0),
            ROUTE_ID,
            address(0xB0B),
            int128(0),
            int128(0),
            uint160(0),
            uint128(0),
            int24(0),
            uint24(300),
            uint256(67890)
        );

        require(keccak256(payload) == keccak256(expected), "v2 payload should normalize");
    }

    function testWatchedSourceMetadataIsExposed() public {
        WillLeadMultiSourceSwapListener listener = _deployListener();

        require(listener.watchedSourceCount() == 2, "expected 2 watched sources");

        (address source0, uint256 topic00, uint24 feeTag0, bool useTopic1AsSender0) = listener.watchedSourceAt(0);
        require(source0 == V3_POOL, "unexpected source0");
        require(topic00 == V3_SWAP_TOPIC0, "unexpected topic00");
        require(feeTag0 == 10_000, "unexpected feeTag0");
        require(useTopic1AsSender0, "unexpected sender flag0");

        (address source1, uint256 topic01, uint24 feeTag1, bool useTopic1AsSender1) = listener.watchedSourceAt(1);
        require(source1 == V2_POOL, "unexpected source1");
        require(topic01 == V2_SWAP_TOPIC0, "unexpected topic01");
        require(feeTag1 == 300, "unexpected feeTag1");
        require(useTopic1AsSender1, "unexpected sender flag1");
    }

    function _deployListener() internal returns (WillLeadMultiSourceSwapListener listener) {
        address[] memory sources = new address[](2);
        uint256[] memory topic0s = new uint256[](2);
        uint24[] memory feeTags = new uint24[](2);
        bool[] memory useTopic1AsSender = new bool[](2);

        sources[0] = V3_POOL;
        topic0s[0] = V3_SWAP_TOPIC0;
        feeTags[0] = 10_000;
        useTopic1AsSender[0] = true;

        sources[1] = V2_POOL;
        topic0s[1] = V2_SWAP_TOPIC0;
        feeTags[1] = 300;
        useTopic1AsSender[1] = true;

        listener = new WillLeadMultiSourceSwapListener(
            sources,
            topic0s,
            feeTags,
            useTopic1AsSender,
            TARGET_INTENT,
            ROUTE_ID,
            11155111,
            11155111,
            500_000
        );
    }
}
