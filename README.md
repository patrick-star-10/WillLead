# WillLead

中文项目介绍说明文件。  
English version: [README_EN.md](./README_EN.md)

WillLead 是一种新钱包范式的原型：一个以意图为核心、由事件驱动执行的 autonomous wallet。

它不是一个“带一点自动化功能的钱包”，而是在证明另一种钱包模型：

> 用户定义一次意图，钱包在正确事件发生时持续执行这条意图。

本仓库用于 Reactive Network 黑客松提交，目标不是展示“普通 Solidity 合约也能部署”，而是展示真正的响应式执行闭环。

## 一句话说明

- 用户把 intent 保存到链上的 autonomous wallet
- Reactive 合约监听源链 EVM 事件
- Reactive Network 把 callback 路由到目标合约
- 钱包或目标 intent 合约自动执行
- 即使前端离线，执行仍然可以继续

## 这个项目要解决什么问题

传统钱包是被动的。

用户每次想完成链上动作，都要重新打开前端、重新连接钱包、重新签名。  
这种模型不适合下面这些需求：

- “当某个事件发生时，自动执行一笔动作”
- “当上游协议出现某个信号时，钱包继续执行我的计划”
- “即使我离线，链上执行也不要停”

WillLead 想证明的是：

- 钱包不应该只保存私钥和余额
- 钱包应该能够保存用户意图
- 钱包应该在事件发生时继续代表用户执行

## 为什么这里必须用 Reactive Network

这个项目里，Reactive Network 不是装饰，也不是“顺手部署一下”。

如果没有 Reactive Network，这条链路会退化成：

- 链下 bot 自己轮询 origin 事件
- 链下服务自己拼 callback 和目标交易
- 自动化逻辑不属于钱包，只是外挂脚本

而在 WillLead 里，Reactive Network 负责：

- 监听源链事件
- 触发响应式 listener
- 生成并路由目标链 callback
- 让目标侧合约按已保存的 intent 执行

这也是为什么 WillLead 要被定义成 `reactive-native wallet`，而不是“普通钱包 + 一点自动化”。

## 核心架构

主执行路径如下：

```text
Origin Event
  -> Reactive Contract Listener
  -> Reactive Callback
  -> Destination Autonomous Wallet / Intent Contract
  -> Intent Execution
  -> Frontend State Refresh / Proof View
```

当前仓库里已经验证过三条关键路径：

1. 钱包转账 intent
   `SignalEmitter -> WillLeadReactiveListener -> WillLeadWallet.callback(...) -> transfer execution`

2. mirrored intent + permissionless `poke()`
   `mirrored intent on origin -> permissionless poke(wallet, nonce) -> Reactive callback -> wallet execution`

3. 真实协议事件 -> 钱包内 faucet intent
   `real Sepolia swap -> WillLeadMultiSourceSwapListener -> WillLeadWallet.swapCallback(...) -> wallet-funded faucet request`

## 仓库中的合约角色

### Origin Contracts

- `WillLeadSignalEmitter`
  源链信号合约。保存 mirrored intent，并提供 permissionless `poke(wallet, nonce)` 发出 `StrategySignal`。

### Reactive Contracts

- `WillLeadReactiveListener`
  监听 `StrategySignal`，把 callback payload 路由到目标钱包。
- `WillLeadMultiSourceSwapListener`
  监听多条真实 Sepolia swap 事件，把 callback payload 路由到目标 autonomous wallet。
- `WillLeadPoolSwapListener`
- `WillLeadRoutePoolSwapListener`
- `WillLeadUniswapV4SwapListener`
- `WillLeadWalletTransferListener`

### Destination Contracts

- `WillLeadWallet`
  autonomous wallet。保存转账 intent、swap intent、runtime 状态、最后一次执行信息，并在 callback 到达时真正执行。
- `WillLeadWalletFactory`
  为每个 owner 创建并发现对应的 autonomous wallet。
- `WillLeadReactiveFaucetIntent`
  仓库中仍保留的独立目标 intent 合约，用于更早版本的 faucet callback 路径和兼容性验证。

## 钱包为什么不是普通合约壳子

`WillLeadWallet` 不是只存配置，它有明确的运行时状态模型：

- `Inactive`
- `Active`
- `Paused`
- `Exhausted`

它还会记录：

- `lastExecutionNonce`
- `lastExecutedAt`
- `lastSignalHash`
- duplicate signal 防护
- 执行次数上限
- runtime route binding
- swap intent route 与执行状态

这部分很关键，因为它对应的不是一次性 demo，而是“钱包本身具备运行态”。

## 已部署合约地址

当前仓库接了两套已经验证过的 execution environment。

### Primary Flow

Origin chain: Ethereum Sepolia (`11155111`)  
Reactive chain: Reactive Lasna (`5318007`)  
Destination chain: Ethereum Sepolia (`11155111`)

| 角色 | 地址 |
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

| 角色 | 地址 |
| --- | --- |
| Origin `WillLeadSignalEmitter` | `0x69143b7e91e7015B87F72c557B3A410D9Bf25081` |
| Reactive `WillLeadReactiveListener` | `0xBbaD3b3D7F02DC7D1B7c2D3F59b391398c6E818F` |
| Destination `WillLeadWalletFactory` | `0x944F5DA0d85Fa1fd2e0E281C9D2622987bd0EFB0` |
| Destination `WillLeadWallet` | `0x8A99EA6b4E931E1e95bD228d28078aFCe1f31c31` |
| Destination callback proxy | `0x0000000000000000000000000000000000fffFfF` |
| Authorized RVM ID | `0x791DdA64Ce022269244647699C071dea2cf0fa82` |

### Real Protocol Event Listener

| 角色 | 地址 |
| --- | --- |
| `WillLeadMultiSourceSwapListener` | `0xf448eDB9244dadfC5135bb9b89023c567B9F9CC9` |

这条真实协议事件路径当前监听的 Sepolia 池：

- fee 100: `0xFeEd501c2B21D315F04946F85fC6416B640240b5`
- fee 500: `0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1`
- fee 3000: `0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50`
- fee 10000: `0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47`
- Circle Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Sepolia WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

## 已验证工作流与交易哈希

### 1. Raw Signal 路径

这是最基础的响应式闭环：

`emitSignal(...) -> Reactive listener -> wallet callback -> destination execution`

- Origin signal:
  `0xae457bbcb7822be50027c9d31ed392aa52faad45f1c431d28130b7bfad9fa7d3`
- Destination execution:
  `0x8de1684ceafaf6293f5d098f6f690953849f1a9c14f81cf8f4e9a2e3eb0a7584`

### 2. Mirrored Intent + Permissionless `poke()` 路径

这是当前更接近产品形态的转账 intent 路径：

- 用户在目标侧钱包保存 intent
- operator 把当前 intent 镜像到 origin emitter
- keeper 或脚本可以直接调用 `poke(wallet, nonce)`
- Reactive Network 路由 callback
- 目标侧钱包按已保存的 intent 执行

已验证交易：

- Intent configured:
  `0xd2c178ea2a913de8d2753d39cb30064ea28525c26ce9194197d0f2bfe908d1e1`
- Origin permissionless poke:
  `0x6eb2c2db96dba97c5f75c5fcb6c515e5f2a3794c98e1f6c17054b95af2e4d5a9`
- Reactive dispatch:
  `0x615eed2c1948971dbe5bf3f73d42e48bdc943b4c676d4fce8ceda124e7730e5f`
- Destination execution:
  `0x5e01719af3cfad116144118372cc5d6a69e0141ca5ece0a41e7de3b27cf77abe`

### 3. 真实协议事件 -> 钱包内 Faucet Intent 路径

这条路径证明 WillLead 不只是依赖 demo emitter。  
真实上游协议事件可以直接进入 autonomous wallet，并由钱包自己的执行余额去调用官方 faucet `request(address)`。

已验证交易：

- Source swap:
  `0xec408d555a87a07db58d5de6e72dbb3a86b3b71394fd53198ff1aea7d0d0302a`
- Destination faucet request:
  `0xa38a1ec5571ae27d3aa813e3ae6f1c41f3d2bd056eb9b4d254ca283580606ff9`

## 部署后的完整运行逻辑

1. 用户在前端连接 controller wallet。
2. 前端通过 `WillLeadWalletFactory` 发现或创建这位用户对应的 autonomous wallet。
3. 用户把 intent 保存到 autonomous wallet。
4. operator 把这条 intent 镜像到源链的 `WillLeadSignalEmitter`。
5. 源链事件发生：
   - 可以是 raw signal
   - 可以是 permissionless `poke(wallet, nonce)`
   - 也可以是真实协议事件，比如被监听的 Sepolia swap
6. Reactive Network 上的 listener 收到源链事件，生成目标 callback payload。
7. 目标侧钱包或目标侧 intent 合约通过 callback proxy 接收 callback。
8. 目标合约校验 callback 后执行已保存的 intent。
9. 前端刷新状态，并展示三段 proof：
   - `Origin Signal`
   - `Reactive Callback`
   - `Destination Execution`

## 给评委的叙事口径

推荐一句话：

> This is not a wallet with optional automation. Each user gets their own autonomous wallet, and a shared reactive runtime keeps executing that wallet's saved intent after the frontend goes offline.

中文版可以讲成：

> 这不是一个“附带自动化功能的钱包”，而是一种新的钱包范式：用户拥有自己的 autonomous wallet，当前端离线后，共享的 reactive runtime 仍然会继续执行这只钱包已经保存的意图。

更短的产品句子：

> Configure once. Execute later, when the right event happens.

## 仓库结构

```text
contracts/
  src/      合约源码
  script/   部署、资金补充、同步、proof、demo 脚本
  test/     Foundry 测试
frontend/
  src/      前端界面、钱包状态、proof panel、execution dashboard
```

关键文件：

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

## 本地运行

### 合约

```bash
forge build
forge test --offline
```

从空环境开始的推荐顺序：

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

也可以压成：

```bash
./contracts/script/bootstrap-demo.sh <token> <recipient>
```

### 前端

```bash
cd frontend
npm install
npm run build
npm run dev
```

前端脚本：

- `npm run dev`
  启动前端和本地 demo 用的 operator 进程。
- `npm run dev:ui`
  只启动前端。
- `npm run operator`
  启动当前 execution environment 的 operator。
- `EXECUTION_ENV=lasna npm run operator`
  启动 Lasna execution operator。

## Proof 收集

收集当前环境下最新的 proof：

```bash
./contracts/script/collect-proof.sh
```

会输出最近的：

- wallet creation
- origin signal
- reactive dispatch
- destination execution

在录最终 demo 视频前，建议先检查 readiness：

```bash
./contracts/script/demo-readiness.sh
```

如果已经触发了 source event，想等 destination execution 真正落地：

```bash
./contracts/script/wait-for-execution.sh <executionNonce>
```

## 当前范围

这个仓库是一个有意聚焦的 MVP，不是完整消费级钱包。

已经证明的能力：

- user-specific autonomous wallet
- onchain intent storage
- 通过 Reactive contracts 的事件驱动执行
- mirrored intent + permissionless trigger 路径
- proof 收集与 activity 展示
- Sepolia execution 和 Lasna execution 双环境
- 第二条真实协议事件驱动的 intent 路径

暂时还不是重点的部分：

- 多 intent portfolio wallet
- 长期在线 keeper network
- 完整历史索引
- 更完整的钱包产品 UX

## 总结

WillLead 想证明的是另一种钱包模型：

- 传统钱包：用户点一下，钱包动一次
- WillLead：用户定义一次意图，钱包在正确事件到来时持续执行

这就是这个项目希望借助 Reactive Network 证明的核心观点。
