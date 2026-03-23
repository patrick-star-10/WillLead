// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReactiveFaucet {
    function request(address recipient) external payable;
}
