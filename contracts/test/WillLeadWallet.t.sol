// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadWallet} from "../src/WillLeadWallet.sol";

contract WillLeadWalletTest {
    address internal constant AUTHORIZED_RVM_ID = address(0xB0B);
    address payable internal constant RECIPIENT = payable(address(0xCAFE));

    receive() external payable {}

    function testReconfigureIntentResetsRuntimeHistory() public {
        WillLeadWallet wallet = new WillLeadWallet(address(this), address(this), AUTHORIZED_RVM_ID);
        _fundWallet(address(wallet), 5 ether);

        _configureIntent(wallet, 5);
        wallet.callback(AUTHORIZED_RVM_ID, address(0), RECIPIENT, 1 ether, 1, 100, 111);

        (, , , , , uint256 executedCountBefore) = wallet.intent();

        require(wallet.lastExecutionNonce() == 1, "expected nonce before reconfigure");
        require(executedCountBefore == 1, "expected executed count before reconfigure");
        require(wallet.lastExecutedAt() != 0, "expected executed timestamp before reconfigure");
        require(wallet.lastSignalHash() != bytes32(0), "expected signal hash before reconfigure");

        _configureIntent(wallet, 3);

        (
            bool enabled,
            address token,
            address recipient,
            uint256 amountPerExecution,
            uint256 maxExecutions,
            uint256 executedCount
        ) = wallet.intent();

        require(enabled, "intent should stay enabled");
        require(token == address(0), "token should remain native");
        require(recipient == RECIPIENT, "recipient should be updated");
        require(amountPerExecution == 1 ether, "amount should remain fixed");
        require(maxExecutions == 3, "max executions should update");
        require(executedCount == 0, "executed count should reset");
        require(wallet.lastExecutionNonce() == 0, "execution nonce should reset");
        require(wallet.lastExecutedAt() == 0, "last executed timestamp should reset");
        require(wallet.lastSignalHash() == bytes32(0), "signal hash should reset");
    }

    function testReconfigureIntentAllowsFreshNonceSequence() public {
        WillLeadWallet wallet = new WillLeadWallet(address(this), address(this), AUTHORIZED_RVM_ID);
        _fundWallet(address(wallet), 5 ether);

        _configureIntent(wallet, 5);
        wallet.callback(AUTHORIZED_RVM_ID, address(0), RECIPIENT, 1 ether, 1, 100, 111);

        uint256 recipientBalanceBefore = RECIPIENT.balance;

        _configureIntent(wallet, 3);
        wallet.callback(AUTHORIZED_RVM_ID, address(0), RECIPIENT, 1 ether, 1, 200, 222);

        (, , , , , uint256 executedCountAfter) = wallet.intent();

        require(wallet.lastExecutionNonce() == 1, "new plan should accept nonce one");
        require(executedCountAfter == 1, "new plan should track first execution");
        require(RECIPIENT.balance == recipientBalanceBefore + 1 ether, "recipient should receive transfer");
    }

    function _configureIntent(WillLeadWallet wallet, uint256 maxExecutions) internal {
        (bool ok,) = address(wallet).call(
            abi.encodeWithSelector(
                wallet.configureIntent.selector,
                address(0),
                RECIPIENT,
                1 ether,
                maxExecutions,
                0.1 ether
            )
        );
        require(ok, "configure intent failed");
    }

    function _fundWallet(address wallet, uint256 amount) internal {
        (bool ok,) = payable(wallet).call{value: amount}("");
        require(ok, "fund wallet failed");
    }
}
