// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWillLeadWallet {
    function callback(
        address rvmId,
        address token,
        address recipient,
        uint256 amount,
        uint256 executionNonce,
        uint256 emittedAt,
        uint256 originTxHash
    ) external;
}
