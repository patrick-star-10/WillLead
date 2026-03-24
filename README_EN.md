# WillLead

WillLead is a prototype of a new wallet paradigm: an intent-native, event-driven autonomous wallet.

Instead of asking users to come back and manually repeat the same onchain action forever, WillLead lets the user configure intent once and lets the wallet keep executing that intent when the right onchain event happens.

This repository was built for the Reactive Network hackathon and is designed to show real reactive behavior, not just ordinary Solidity contracts deployed somewhere else.

## TL;DR

- The user saves intent onchain in a dedicated autonomous wallet.
- A Reactive contract listens for origin-side EVM events.
- Reactive Network routes the callback to the destination-side wallet or intent contract.
- The wallet executes the saved intent even after the frontend goes offline.

Current MVP thesis:

> A wallet should not only store keys and balances. A wallet should be able to hold intent and keep executing it.

## What Problem It Solves

Traditional wallets are passive. They only move when the user comes back, opens the frontend, and signs again.

That model breaks down for repeated or event-driven actions:

- "Send funds when this trigger happens."
- "React when a protocol event appears."
- "Keep executing my saved plan even if I am offline."

WillLead turns the wallet into an autonomous onchain execution unit:

- the user signs once during setup
- the intent stays onchain
- reactive execution can keep happening later
- the frontend is no longer the system that must stay alive for the wallet to act

## Why Reactive Network Is Necessary

This project is not using Reactive Network as branding. It depends on reactive execution for the core user experience.

Without Reactive Network, this flow becomes much harder and much less native:

- you need a separate offchain bot to poll origin events
- you need custom infra to detect, relay, and submit destination transactions
- the wallet is still basically passive, and automation lives outside of it

With Reactive Network:

- Reactive contracts subscribe to origin-side EVM events
- the listener emits a destination callback payload
- destination contracts execute based on saved onchain intent

That is the core reason WillLead is framed as a reactive-native wallet rather than a normal wallet with optional automation.

## Architecture

Main execution path:

```text
Origin Event
  -> Reactive Contract Listener
  -> Reactive Callback
  -> Destination Autonomous Wallet / Intent Contract
  -> Intent Execution
  -> Frontend State Refresh / Proof View
```

There are three validated execution patterns in this repository:

1. Wallet transfer intent
   `SignalEmitter -> WillLeadReactiveListener -> WillLeadWallet.callback(...) -> transfer execution`

2. Mirrored intent + permissionless trigger
   `mirrored intent on origin -> permissionless poke(wallet, nonce) -> Reactive callback -> wallet execution`

3. Real protocol event intent
   `real Sepolia swap -> WillLeadMultiSourceSwapListener -> WillLeadWallet.swapCallback(...) -> wallet-funded faucet request`

## Contracts In This Repo

### Origin Contracts

- `WillLeadSignalEmitter`
  Stores mirrored intent on the origin side and exposes permissionless `poke(wallet, nonce)` to emit `StrategySignal`.

### Reactive Contracts

- `WillLeadReactiveListener`
  Subscribes to `StrategySignal` and dispatches callback payloads to destination wallets.
- `WillLeadMultiSourceSwapListener`
  Subscribes to multiple real Sepolia swap sources and dispatches callback payloads to the autonomous wallet.
- `WillLeadPoolSwapListener`
- `WillLeadRoutePoolSwapListener`
- `WillLeadUniswapV4SwapListener`
- `WillLeadWalletTransferListener`

### Destination Contracts

- `WillLeadWallet`
  The autonomous wallet that stores transfer intent, swap intent, runtime state, last execution data, and executes on callback.
- `WillLeadWalletFactory`
  Creates and discovers the autonomous wallet for each owner.
- `WillLeadReactiveFaucetIntent`
  A legacy standalone destination intent contract still kept in the repo for the earlier faucet-callback flow and compatibility testing.

## Key Contract Behaviors

The destination wallet is not just a vault. It has an explicit runtime model:

- `Inactive`
- `Active`
- `Paused`
- `Exhausted`

It also tracks:

- `lastExecutionNonce`
- `lastExecutedAt`
- `lastSignalHash`
- duplicate signal protection
- execution count limits
- runtime route binding
- swap intent route and execution state

That runtime state is part of the wallet product thesis: the wallet is not only a signer, it is an execution system.

## Deployed Contracts

The current repo is wired to two verified execution environments.

### Primary Flow

Origin chain: Ethereum Sepolia (`11155111`)  
Reactive chain: Reactive Lasna (`5318007`)  
Destination chain: Ethereum Sepolia (`11155111`)

| Role | Address |
| --- | --- |
| Origin `WillLeadSignalEmitter` | `0xD7e000a926B7fbA4ed9b6bdb1Cb012406240b0Be` |
| Reactive `WillLeadReactiveListener` | `0xE6E1D64ADDb10981e659C86E8025ce8Be190E584` |
| Destination `WillLeadWalletFactory` | `0x34fC48aAA456Eb807e761E72Df4E1aE6a23f59c1` |
| Destination `WillLeadWallet` | `0x583563184753f51EAaE7489ec4935f77D4315f7E` |
| Destination callback proxy | `0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA` |
| Authorized RVM ID | `0x791DdA64Ce022269244647699C071dea2cf0fa82` |

### Lasna Execution Flow

Origin chain: Ethereum Sepolia (`11155111`)  
Reactive chain: Reactive Lasna (`5318007`)  
Destination chain: Reactive Lasna (`5318007`)

| Role | Address |
| --- | --- |
| Origin `WillLeadSignalEmitter` | `0x69143b7e91e7015B87F72c557B3A410D9Bf25081` |
| Reactive `WillLeadReactiveListener` | `0xBbaD3b3D7F02DC7D1B7c2D3F59b391398c6E818F` |
| Destination `WillLeadWalletFactory` | `0x944F5DA0d85Fa1fd2e0E281C9D2622987bd0EFB0` |
| Destination `WillLeadWallet` | `0x8A99EA6b4E931E1e95bD228d28078aFCe1f31c31` |
| Destination callback proxy | `0x0000000000000000000000000000000000fffFfF` |
| Authorized RVM ID | `0x791DdA64Ce022269244647699C071dea2cf0fa82` |

### Real Protocol Event Listener

| Role | Address |
| --- | --- |
| `WillLeadMultiSourceSwapListener` | `0xf448eDB9244dadfC5135bb9b89023c567B9F9CC9` |

Watched real Sepolia pools used in the verified swap-driven path:

- fee 100: `0xFeEd501c2B21D315F04946F85fC6416B640240b5`
- fee 500: `0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1`
- fee 3000: `0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50`
- fee 10000: `0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47`
- Circle Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Sepolia WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

## Verified Workflows And Transaction Hashes

### 1. Raw Signal Path

This is the minimum end-to-end reactive flow:

`emitSignal(...) -> Reactive listener -> wallet callback -> destination execution`

- Origin signal:
  `0xae457bbcb7822be50027c9d31ed392aa52faad45f1c431d28130b7bfad9fa7d3`
- Destination execution:
  `0x8de1684ceafaf6293f5d098f6f690953849f1a9c14f81cf8f4e9a2e3eb0a7584`

### 2. Mirrored Intent + Permissionless `poke()` Path

This is the product-shaped path for the transfer intent:

- the wallet stores the intent on the destination side
- the operator mirrors the current intent to the origin emitter
- any keeper or script can call `poke(wallet, nonce)`
- Reactive Network routes the callback
- the destination wallet executes saved intent

Verified transactions:

- Intent configured:
  `0xd2c178ea2a913de8d2753d39cb30064ea28525c26ce9194197d0f2bfe908d1e1`
- Origin permissionless poke:
  `0x6eb2c2db96dba97c5f75c5fcb6c515e5f2a3794c98e1f6c17054b95af2e4d5a9`
- Reactive dispatch:
  `0x615eed2c1948971dbe5bf3f73d42e48bdc943b4c676d4fce8ceda124e7730e5f`
- Destination execution:
  `0x5e01719af3cfad116144118372cc5d6a69e0141ca5ece0a41e7de3b27cf77abe`

### 3. Real Protocol Event -> Wallet-Funded Faucet Path

This path proves that WillLead is not limited to a demo emitter. A real upstream protocol event can flow directly into the autonomous wallet, which then uses its own execution balance to call the official faucet `request(address)`.

Verified transactions:

- Source swap:
  `0xec408d555a87a07db58d5de6e72dbb3a86b3b71394fd53198ff1aea7d0d0302a`
- Destination faucet request:
  `0xa38a1ec5571ae27d3aa813e3ae6f1c41f3d2bd056eb9b4d254ca283580606ff9`

## Post-Deployment Workflow

This is the step-by-step runtime logic after deployment.

1. The user connects a controller wallet in the frontend.
2. The frontend discovers or creates the user-specific autonomous wallet through `WillLeadWalletFactory`.
3. The user saves an intent onchain in the autonomous wallet.
4. The operator mirrors that intent to the origin-side `WillLeadSignalEmitter`.
5. A source event happens:
   - either a raw signal
   - or permissionless `poke(wallet, nonce)`
   - or a real protocol event such as a watched Sepolia swap
6. A Reactive contract listener on Reactive Network receives the origin event and emits a destination callback payload.
7. The destination wallet or destination intent contract receives the callback through the callback proxy.
8. The destination contract validates the callback and executes the saved intent.
9. The frontend refreshes wallet state and shows proof entries for:
   - `Origin Signal`
   - `Reactive Callback`
   - `Destination Execution`

## Demo Narrative

The intended judge narrative is:

> This is not a wallet with optional automation. Each user gets their own autonomous wallet, and a shared reactive runtime keeps executing that wallet's saved intent after the frontend goes offline.

The short product line is:

> Configure once. Execute later, when the right event happens.

## Repository Map

```text
contracts/
  src/      smart contracts
  script/   deployment, funding, sync, proof, and demo scripts
  test/     Foundry tests
frontend/
  src/      UI, wallet state, proof panel, execution dashboard
```

Important files:

- `contracts/src/WillLeadWallet.sol`
- `contracts/src/WillLeadWalletFactory.sol`
- `contracts/src/WillLeadSignalEmitter.sol`
- `contracts/src/WillLeadReactiveListener.sol`
- `contracts/src/WillLeadReactiveFaucetIntent.sol`
- `contracts/src/WillLeadMultiSourceSwapListener.sol`
- `contracts/script/deploy-local.sh`
- `contracts/script/create-wallet.sh`
- `contracts/script/configure-intent.sh`
- `contracts/script/sync-listener-subscription.sh`
- `contracts/script/fund-reactive-listener.sh`
- `contracts/script/fund-callback.sh`
- `contracts/script/poke-signal.sh`
- `contracts/script/collect-proof.sh`
- `contracts/script/demo-readiness.sh`
- `Demo_Runbook.md`

## Local Setup

### Contracts

```bash
forge build
forge test --offline
```

Recommended setup flow from a fresh environment:

```bash
cp .env.example .env
./contracts/script/verify-env.sh
./contracts/script/deploy-local.sh
./contracts/script/create-wallet.sh
./contracts/script/verify-deployments.sh
./contracts/script/sync-listener-subscription.sh
./contracts/script/sync-swap-listener-subscription.sh
./contracts/script/fund-reactive-listener.sh
./contracts/script/fund-callback.sh
./contracts/script/configure-intent.sh <token> <recipient>
./contracts/script/sync-frontend-env.sh
./contracts/script/demo-readiness.sh
```

You can also compress most of this into:

```bash
./contracts/script/bootstrap-demo.sh <token> <recipient>
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

Available frontend scripts:

- `npm run dev`
  Starts the frontend plus operator processes used for local demo.
- `npm run dev:ui`
  Starts only the frontend.
- `npm run operator`
  Starts the current execution-environment operator.
- `EXECUTION_ENV=lasna npm run operator`
  Starts the Lasna execution operator.

## Proof Collection

To collect the latest proof entries from the currently configured environment:

```bash
./contracts/script/collect-proof.sh
```

This prints the latest:

- wallet creation
- origin signal
- reactive dispatch
- destination execution

To verify demo readiness before recording the final video:

```bash
./contracts/script/demo-readiness.sh
```

To wait until a destination execution really lands after a trigger:

```bash
./contracts/script/wait-for-execution.sh <executionNonce>
```

## Current Scope

This repository is intentionally an MVP, not a full consumer wallet.

Already proven:

- user-specific autonomous wallet
- onchain intent storage
- event-driven execution through Reactive contracts
- mirrored intent + permissionless trigger path
- proof collection and activity view
- Sepolia execution and Lasna execution environments
- a second real protocol-event-driven intent path

Not yet the focus:

- multi-intent portfolio wallet
- long-term keeper network deployment
- full history indexer
- polished production wallet UX

## Summary

WillLead argues for a different wallet model:

- traditional wallet: user clicks, wallet acts once
- WillLead: user defines intent, wallet keeps acting when the right event arrives

That is the core idea this project is trying to prove with Reactive Network.
