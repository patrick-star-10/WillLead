# WillLead Post-Deployment Workflow

This document explains how WillLead works after deployment.
It is written for users, reviewers, and judges who need a clear description of the live runtime flow.

WillLead is not a local-only UI demo. It is a deployed execution model in which a wallet stores intent onchain, waits for events, receives Reactive callbacks, and executes after the frontend goes offline.

## Deployed Components

After deployment, the system includes:

- a controller wallet used for connection and signing
- an autonomous `WillLeadWallet` on the destination side
- an origin-side signal source
- a Reactive listener on Reactive Network
- a callback proxy for destination delivery
- a frontend that reads state, readiness, and proof
- an operator runtime that keeps the route usable

## Runtime Roles

### Controller Wallet

The controller wallet is the user-facing signer.
It connects to the frontend, creates or discovers the autonomous wallet, saves intent, and funds execution when needed.

### Autonomous Wallet

The autonomous wallet is the execution unit.
It stores the active intent, stores the runtime binding, validates callbacks, executes when a valid event arrives, and records execution state.

### Reactive Listener

The Reactive listener watches the expected origin event path and turns a valid event into a destination-side callback payload.

### Operator Runtime

The operator runtime keeps the deployed path healthy over time.
It helps keep the listener armed, keeps mirrored transfer intent in sync, repairs route state when needed, and exposes runtime status to the frontend.

## Full Post-Deployment Workflow

### Step 1. Connect the controller wallet

The user connects a wallet through the frontend.
The frontend reads the connected owner address and begins resolving the wallet state for that owner.

### Step 2. Discover or initialize the autonomous wallet

The frontend checks the wallet factory for an autonomous wallet bound to the connected owner.

- If a wallet already exists, the frontend binds to it.
- If no wallet exists yet, the owner initializes one once.

After that, the same owner can reconnect and the frontend can discover the wallet again.

### Step 3. Load wallet and runtime state

Once the autonomous wallet is known, the frontend loads:

- intent state
- runtime status
- runtime binding
- callback credit
- listener status
- operator status
- proof history

This shows whether the deployed wallet is ready to keep executing.

### Step 4. Save intent onchain

The user signs once from the controller wallet to save intent into the autonomous wallet.

For the transfer path, the wallet stores:

- token
- recipient
- amount per execution
- max executions
- minimum automation balance

For the swap-triggered path, the wallet stores:

- faucet target
- recipient
- request value
- max executions

At this point, the intent stops being temporary frontend input and becomes persistent wallet state.

### Step 5. Synchronize the runtime path

After intent is saved, the deployed route is prepared for execution.

For the transfer path, the operator mirrors the active intent to the origin-side signal layer and checks that the Reactive listener is armed and funded.

For the swap-triggered path, the wallet waits for the configured upstream protocol event.

### Step 6. Wait for the origin event

Once the route is ready, the frontend does not need to remain online.
The system waits for a valid origin-side trigger, such as:

- a direct demo signal
- a mirrored-intent poke
- a real upstream protocol event

### Step 7. Reactive Network dispatches the callback

When the watched event occurs, the Reactive listener verifies the event source and route configuration, then builds the callback payload and dispatches it toward the autonomous wallet.

This is the handoff from origin-side event detection to destination-side wallet execution.

### Step 8. The autonomous wallet validates and executes

When the callback arrives, the autonomous wallet checks:

- authorized callback path
- active runtime status
- matching intent
- duplicate protection
- execution limits
- available balance

If validation passes, the wallet executes the saved action.
If validation fails in a recoverable way, the wallet records a skipped execution reason instead.

### Step 9. Proof is surfaced to the frontend

After execution, the frontend and scripts read chain history and surface proof, including:

- origin signal observed
- Reactive callback observed
- destination execution observed
- or destination skip reason

This is what makes the runtime judgeable as a deployed execution system rather than a local simulation.

## Transfer Path and Swap Path

The current deployment demonstrates two runtime behaviors:

### Transfer Path

The user saves a transfer intent once.
Each valid matching callback triggers the same destination-side transfer until the execution limit is reached.

### Swap-Triggered Path

The user saves a response intent once.
The wallet then waits for a real watched protocol event, and when that event arrives, the wallet executes the configured faucet request from its own balance.

## Current Demo Scope

The current deployed version should be understood as a focused single-user hackathon deployment.

That limitation is mainly due to time, not architecture.
The wallet factory and owner-based wallet resolution already point toward a multi-user design, but this submission only had enough time to fully provision and validate one end-to-end demo owner path.

In practice, a newly connected wallet may need its own autonomous wallet to be initialized first, and the operator/runtime path in this submission is still provisioned around the demo deployment rather than a fully generalized multi-user environment.

The swap-triggered demo path is even more tightly scoped, because it depends on a specific deployed listener, watched pool, and faucet route prepared for this submission.

## Why This Matters

WillLead shows a different wallet model.

Instead of treating the wallet as a passive signer, it treats the wallet as persistent execution state:

- intent lives in the wallet
- runtime bindings live in the wallet
- execution state lives in the wallet
- proof comes from wallet-visible onchain history

That is why this model is different from bot automation.
Bots automate transactions from outside the wallet.
WillLead moves intent and execution into the wallet model itself.

## Next Direction

The current deployment is intentionally narrow because of submission time constraints.
The next stage is to generalize the same architecture into a real multi-user runtime, where each owner can initialize a wallet, receive dedicated runtime support, and use the same execution model without depending on a single demo path.

Over time, this can evolve beyond a wallet prototype into a broader consumer intent execution layer built on Reactive-native wallet behavior.
