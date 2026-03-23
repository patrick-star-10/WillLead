// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWillLeadSwapCallbackTarget {
    function callback(
        address rvmId,
        bytes32 poolId,
        address swapSender,
        int128 amount0,
        int128 amount1,
        uint160 sqrtPriceX96,
        uint128 liquidity,
        int24 tick,
        uint24 fee,
        uint256 originTxHash
    ) external;
}
