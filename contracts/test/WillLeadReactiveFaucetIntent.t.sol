// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WillLeadReactiveFaucetIntent} from "../src/WillLeadReactiveFaucetIntent.sol";

contract MockReactiveFaucet {
    address public lastRecipient;
    uint256 public lastValue;
    uint256 public requestCount;
    bool public shouldRevert;

    function setShouldRevert(bool nextShouldRevert) external {
        shouldRevert = nextShouldRevert;
    }

    function request(address recipient) external payable {
        require(!shouldRevert, "mock faucet revert");
        lastRecipient = recipient;
        lastValue = msg.value;
        requestCount += 1;
    }
}

contract WillLeadReactiveFaucetIntentTest {
    address internal constant AUTHORIZED_RVM_ID = address(0xB0B);
    address internal constant LISTENER = address(0x157);
    address internal constant POOL_MANAGER = address(0x5050);
    address internal constant LREACT_RECIPIENT = address(0xCAFE);
    bytes32 internal constant POOL_ID = bytes32(uint256(0x1234));
    address internal constant SWAP_SENDER = address(0xA11CE);

    function testCallbackRequestsFaucetAfterMatchingSwap() public {
        WillLeadReactiveFaucetIntent intent = _deployIntent();
        MockReactiveFaucet faucet = new MockReactiveFaucet();

        intent.configureRuntimeRoute(
            LISTENER,
            POOL_MANAGER,
            POOL_ID,
            11155111,
            11155111,
            uint256(keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)"))
        );
        intent.configureIntent(address(faucet), LREACT_RECIPIENT, 0.1 ether, 2);
        _fundIntent(address(intent), 1 ether);

        intent.callback(AUTHORIZED_RVM_ID, POOL_ID, SWAP_SENDER, -1, 1, 100, 200, 10, 500, 12345);

        (, , , , , uint256 executedCount) = intent.getIntentSummary();
        require(executedCount == 1, "expected execution count");
        require(faucet.requestCount() == 1, "expected faucet request");
        require(faucet.lastRecipient() == LREACT_RECIPIENT, "expected lreact recipient");
        require(faucet.lastValue() == 0.1 ether, "expected request value");
        require(intent.lastOriginTxHash() == 12345, "expected origin tx hash");
    }

    function testPausedIntentSkipsCallback() public {
        WillLeadReactiveFaucetIntent intent = _deployIntent();
        MockReactiveFaucet faucet = new MockReactiveFaucet();

        intent.configureRuntimeRoute(
            LISTENER,
            POOL_MANAGER,
            POOL_ID,
            11155111,
            11155111,
            uint256(keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)"))
        );
        intent.configureIntent(address(faucet), LREACT_RECIPIENT, 0.1 ether, 2);
        intent.pauseIntent();
        _fundIntent(address(intent), 1 ether);

        intent.callback(AUTHORIZED_RVM_ID, POOL_ID, SWAP_SENDER, -1, 1, 100, 200, 10, 500, 12345);

        (, , , , , uint256 executedCount) = intent.getIntentSummary();
        require(executedCount == 0, "paused intent should not execute");
        require(faucet.requestCount() == 0, "paused intent should not call faucet");
    }

    function testInsufficientBalanceSkipsWithoutConsumingExecution() public {
        WillLeadReactiveFaucetIntent intent = _deployIntent();
        MockReactiveFaucet faucet = new MockReactiveFaucet();

        intent.configureRuntimeRoute(
            LISTENER,
            POOL_MANAGER,
            POOL_ID,
            11155111,
            11155111,
            uint256(keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)"))
        );
        intent.configureIntent(address(faucet), LREACT_RECIPIENT, 1 ether, 2);

        intent.callback(AUTHORIZED_RVM_ID, POOL_ID, SWAP_SENDER, -1, 1, 100, 200, 10, 500, 12345);

        (, , , , , uint256 executedCount) = intent.getIntentSummary();
        require(executedCount == 0, "expected zero executions");
        require(faucet.requestCount() == 0, "should not call faucet");
    }

    function testDuplicateCallbackReverts() public {
        WillLeadReactiveFaucetIntent intent = _deployIntent();
        MockReactiveFaucet faucet = new MockReactiveFaucet();

        intent.configureRuntimeRoute(
            LISTENER,
            POOL_MANAGER,
            POOL_ID,
            11155111,
            11155111,
            uint256(keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)"))
        );
        intent.configureIntent(address(faucet), LREACT_RECIPIENT, 0.1 ether, 2);
        _fundIntent(address(intent), 1 ether);

        intent.callback(AUTHORIZED_RVM_ID, POOL_ID, SWAP_SENDER, -1, 1, 100, 200, 10, 500, 12345);

        (bool ok,) = address(intent).call(
            abi.encodeWithSelector(
                intent.callback.selector,
                AUTHORIZED_RVM_ID,
                POOL_ID,
                SWAP_SENDER,
                int128(-1),
                int128(1),
                uint160(100),
                uint128(200),
                int24(10),
                uint24(500),
                uint256(12345)
            )
        );

        require(!ok, "duplicate callback should fail");
    }

    function _deployIntent() internal returns (WillLeadReactiveFaucetIntent intent) {
        intent = new WillLeadReactiveFaucetIntent(address(this), address(this), AUTHORIZED_RVM_ID);
    }

    function _fundIntent(address intent, uint256 amount) internal {
        (bool ok,) = payable(intent).call{value: amount}("");
        require(ok, "fund intent failed");
    }

    receive() external payable {}
}
