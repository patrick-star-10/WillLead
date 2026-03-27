# WillLead

Judge-facing project overview.  
Chinese judge-facing version: [README.md](./README.md)

WillLead is a **wallet prototype designed natively for Reactive Network, and a reference implementation for exploring a new wallet paradigm**.

Its goal is not to show that a normal wallet can integrate a bit of Reactive functionality. Its goal is to explore a different wallet paradigm:

**If Reactive Network makes event-driven execution possible, then a wallet should not only hold keys and balances. It should also hold user intent and continue acting on that intent when the right event happens.**

Put more sharply:

- current wallets are session-bound, user-triggered, and single-action
- `Reactive-native wallets` should be persistent, stateful, and event-driven

So the point of WillLead is not "adding automation to a wallet." The point is designing a wallet around **intent**, **runtime state**, and **event-driven execution** as native wallet behavior.

The submission is not primarily about feature count. It is about validating a larger claim:

**Reactive Network is not only an automation layer for existing applications. It may also serve as the execution substrate for a new category of wallets and consumer applications.**

This is not a feature demo.

**It is a minimal reference architecture for Reactive-native wallets.**

## Core Idea

Traditional wallets are passive:

- the user comes back
- opens the frontend
- reconnects the wallet
- signs again

WillLead tries to replace that model with:

- the user saves intent onchain in a personal autonomous wallet
- a Reactive contract listens for origin-side EVM events
- Reactive Network routes the callback to the destination side
- the autonomous wallet executes the saved intent

In other words, WillLead treats the wallet as:

- an onchain holder of intent
- an execution unit with runtime state
- a wallet designed around Reactive Network's event model
- a minimal implementation that can evolve into reusable developer reference architecture

## Why Reactive Network Is Essential Here

Reactive Network is not cosmetic in this project. It is what makes the wallet model possible.

Without Reactive Network, this design collapses back into:

- an offchain bot polling origin events
- offchain infra deciding when to relay and execute
- a wallet that is still fundamentally passive
- automation that lives outside the wallet as a service wrapper

In WillLead:

- a Reactive contract actually listens to EVM events
- that event automatically triggers a callback
- the callback is routed to the destination autonomous wallet
- the wallet executes against already-saved onchain intent

That is why this project is not presented as "a wallet with automation." It is presented as:

**a wallet prototype designed around the way Reactive Network works, and a reference implementation for a Reactive-native wallet direction.**

Its advantage over bots is also not only "more decentralized."

It defines a different product boundary:

- the user does not have to trust an execution layer that lives outside the wallet model
- intent becomes persistent wallet state instead of temporary frontend input
- execution becomes a composable wallet-native capability instead of external automation glue

## Three Verified Execution Paths

### 1. Raw Signal Path

The minimum end-to-end loop:

`emitSignal(...) -> Reactive listener -> wallet callback -> destination execution`

Verified transactions:

- Origin signal  
  `0xae457bbcb7822be50027c9d31ed392aa52faad45f1c431d28130b7bfad9fa7d3`
- Destination execution  
  `0x8de1684ceafaf6293f5d098f6f690953849f1a9c14f81cf8f4e9a2e3eb0a7584`

### 2. Mirrored Intent + Permissionless `poke()` Path

This is the more product-shaped flow:

- the user saves intent in the destination wallet
- the operator mirrors the current intent to `WillLeadSignalEmitter` on the origin side
- any keeper or script can call `poke(wallet, nonce)`
- Reactive Network dispatches the callback
- the destination wallet executes the saved intent

Verified transactions:

- Intent configured  
  `0xd2c178ea2a913de8d2753d39cb30064ea28525c26ce9194197d0f2bfe908d1e1`
- Origin permissionless poke  
  `0x6eb2c2db96dba97c5f75c5fcb6c515e5f2a3794c98e1f6c17054b95af2e4d5a9`
- Reactive dispatch  
  `0x615eed2c1948971dbe5bf3f73d42e48bdc943b4c676d4fce8ceda124e7730e5f`
- Destination execution  
  `0x5e01719af3cfad116144118372cc5d6a69e0141ca5ece0a41e7de3b27cf77abe`

### 3. Real Protocol Event -> Wallet-Funded Faucet Path

This is one of the strongest points of the project.

This path is **not** triggered by a custom demo event from our own contract. It is triggered by **real upstream protocol events**:

- the watched source is a set of real **Uniswap Sepolia** live v3 pools
- the trigger event is `Swap`
- the Reactive listener receives the real protocol event and routes a callback directly into the autonomous wallet
- the autonomous wallet uses its own execution balance to call the official faucet `request(address)`

This path proves two important things:

- WillLead is not limited to self-authored demo events
- WillLead can react to events coming from the outside protocol world

That is one of the strongest pieces of evidence for the `Reactive-native wallet` thesis, because it connects platform capability to a credible user-facing product form.

Verified transactions:

- Source swap  
  `0xec408d555a87a07db58d5de6e72dbb3a86b3b71394fd53198ff1aea7d0d0302a`
- Destination faucet request  
  `0xa38a1ec5571ae27d3aa813e3ae6f1c41f3d2bd056eb9b4d254ca283580606ff9`

## Full Post-Deployment Workflow

1. The user connects a controller wallet.
2. The frontend discovers or creates the user’s autonomous wallet through `WillLeadWalletFactory`.
3. The user saves either a transfer intent or a swap intent into that autonomous wallet.
4. The operator mirrors the transfer intent to the origin-side `WillLeadSignalEmitter`.
5. A source-side event happens:
   - a raw signal
   - a permissionless `poke(wallet, nonce)`
   - or a real protocol event, such as a watched Uniswap Sepolia `Swap`
6. A Reactive contract on Reactive Network receives the origin-side event.
7. The Reactive contract builds the callback payload and routes it to the destination-side autonomous wallet.
8. The autonomous wallet validates the callback and executes the saved intent:
   - fixed transfer
   - or wallet-funded faucet request
9. The frontend refreshes state and surfaces proof entries for:
   - `Origin Signal`
   - `Reactive Callback`
   - `Destination Execution`

## Contract Inventory

### Origin Contract

- `WillLeadSignalEmitter`
  Stores mirrored intent and emits `StrategySignal` for the raw signal and `poke()` paths

### Reactive Contracts

- `WillLeadReactiveListener`
  Listens to `StrategySignal` for the transfer intent path
- `WillLeadMultiSourceSwapListener`
  Listens to multiple real Sepolia swap sources for the swap intent path
- `WillLeadPoolSwapListener`
- `WillLeadRoutePoolSwapListener`
- `WillLeadUniswapV4SwapListener`
- `WillLeadWalletTransferListener`

### Destination Contracts

- `WillLeadWallet`
  A user-specific autonomous wallet that stores transfer intent, swap intent, runtime state, and executes when callbacks arrive
- `WillLeadWalletFactory`
  Creates and discovers the autonomous wallet for each owner
- `WillLeadReactiveFaucetIntent`
  A legacy standalone faucet intent contract still kept in the repository for earlier flows and compatibility validation

## Deployed Contract Addresses

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

Currently watched real Sepolia pools:

- fee 100: `0xFeEd501c2B21D315F04946F85fC6416B640240b5`
- fee 500: `0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1`
- fee 3000: `0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50`
- fee 10000: `0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47`
- Circle Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Sepolia WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

## Why This Project Matters

The point of WillLead is not that it has a wallet UI. The point is that it turns the idea of a Reactive Network-native wallet into a verifiable minimum prototype.

It verifies three things:

- intent can become first-class wallet state rather than temporary frontend input
- Reactive Network can keep the wallet executing after the frontend goes offline
- real upstream protocol events can trigger the autonomous wallet directly, rather than only self-authored demo events

If a traditional wallet can be summarized as:

**"The user clicks once, and the wallet acts once."**

WillLead is trying to prove:

**"The user defines once, and the wallet keeps acting when the right event arrives."**

And more broadly, WillLead is making this claim:

**Reactive Network is not only useful for adding automation to existing apps. It may also enable a new wallet paradigm.**

## Ecosystem Value

From an ecosystem perspective, WillLead is valuable not only as a standalone demo, but as a starting point for several reusable directions:

- a reference implementation for `Reactive-native wallet` architecture
- a developer-facing example of intent-driven consumer application design
- a teaching case for the `origin -> reactive -> destination` execution model
- a platform example showing how real protocol events can directly drive end-user product behavior

For Reactive Network, this makes the project more than a one-off hackathon artifact. It can become a durable product example.

## Why Further Support Would Be Valuable

The value of continuing this direction is not only that the current loop works. It is that the project helps answer larger ecosystem questions:

- how wallets can adopt Reactive execution as native behavior rather than as an add-on
- how intent can become first-class state in wallets and consumer apps
- how real protocol events can become direct triggers for user-facing application behavior
- how Reactive Network can evolve from infrastructure capability into reusable product architecture

That makes the project worth further support because:

- the core loop is already proven, not merely proposed
- the direction is easy to communicate and reuse
- it is naturally suited to become a docs case study, starter, workshop example, or reference implementation

## Next Milestones

The next stage for WillLead is not simply to add more features. It is to harden this direction into a stronger `Reactive-native wallet` reference implementation.

Priority milestones include:

- multi-intent wallet architecture
- more real upstream protocol event templates beyond a single swap path
- more robust operator / keeper deployment
- more complete proof, history, and failure-recovery expression
- developer-facing reference docs and reusable modules

## Repository Structure

```text
contracts/
  src/      smart contracts
  script/   deployment, funding, sync, proof, and demo scripts
  test/     Foundry tests
frontend/
  src/
    app/        app shell
    components/ UI panels and controls
    store/      wallet state orchestration
    lib/
      willlead.ts         public API barrel for the wallet runtime
      actions/            intent, funding, signal, and listener writes
      internal/
        wallet/           binding, wallet state, and tracked assets
        reactive/         listener runtime, automation credit, and proofs
        operator.ts       operator runtime helpers
        storage.ts        execution environment and watched-token storage
        logs.ts           paged log readers
        address.ts        address and topic helpers
        format.ts         formatting helpers
```

After the frontend refactor, `frontend/src/lib/willlead.ts` no longer carries the full implementation. It now acts as a public API barrel.
The actual runtime logic is split across `actions/` and `internal/`, following the boundaries of write paths, wallet reads, reactive reads, and operator helpers. That structure is intended to make future multi-intent, proof, and operator-runtime work easier to extend.

## Verification And Reproduction

Key scripts:

- `contracts/script/deploy-local.sh`
- `contracts/script/create-wallet.sh`
- `contracts/script/configure-intent.sh`
- `contracts/script/sync-listener-subscription.sh`
- `contracts/script/fund-reactive-listener.sh`
- `contracts/script/fund-callback.sh`
- `contracts/script/poke-signal.sh`
- `contracts/script/collect-proof.sh`
- `contracts/script/demo-readiness.sh`

The execution order and demo flow are documented in:

- [Demo_Runbook.md](./Demo_Runbook.md)

Contract tests:

```bash
forge test --offline
```

Frontend build:

```bash
cd frontend
npm run build
```

## Next Extension: LI.FI-Powered Cross-Chain Intent

The current version of WillLead already proves the more foundational point:

- intent can live onchain inside the wallet
- Reactive Network can continue routing external events into wallet execution
- the autonomous wallet can keep acting after the frontend goes offline

From that baseline, the most natural next step is not simply adding more same-chain demos. It is upgrading the current transfer intent from "direct destination-chain transfer" into "destination-side cross-chain execution."

That is why **LI.FI** is a natural next extension for WillLead.

If that path is implemented well, the story becomes stronger than:

- external events can trigger wallet-native automated transfers

It becomes:

- external events can trigger wallet-native cross-chain asset movement
- Reactive Network provides the event-driven execution entry point
- LI.FI provides the downstream routing, bridging, and swapping infrastructure

In other words, the current version already proves that the `Reactive-native wallet` execution model works.  
The LI.FI extension would push that model one step further, toward a more realistic **Reactive-native cross-chain wallet**.

This is not the part that had to be forced into the current submission, but it is one of the clearest and most product-relevant upgrade directions for the project.

Over time, WillLead does not need to stop at being "a wallet."

It can evolve into a more general **consumer intent execution layer**:

- the wallet is only the first product entry point
- persistent intent is the real core state
- composable execution is the larger application direction

## Conclusion

WillLead is not trying to show that "wallets can call Reactive Network."

It is trying to show something stronger:

- a wallet can be designed natively around Reactive Network's event-driven execution model
- intent can become core wallet state
- an autonomous wallet can continue responding after the frontend goes offline
- real protocol events can directly become wallet execution triggers

More broadly, WillLead is trying to show:

- `Reactive-native wallet` is a direction worth continued exploration
- that direction can be distilled into reusable developer and ecosystem reference architecture
- Reactive Network has the potential to support a new class of consumer application architecture, not only automation for existing systems
- WillLead is not only a wallet prototype; it can evolve into a general intent execution layer for consumer applications

If the default assumption behind a traditional wallet is "the wallet acts when the user is online," then the prototype assumption behind WillLead is:

**a wallet should be a Reactive Network-native onchain entity that keeps executing user intent over time.**
