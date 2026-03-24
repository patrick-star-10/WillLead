# WillLead

中文版评审说明文件。  
English judge-facing version: [README_EN.md](./README_EN.md)

WillLead 是一个**面向 Reactive Network 原生设计的钱包原型，也是一个用于探索新钱包范式的参考实现**。

它要证明的不是“普通钱包也可以接一点 Reactive 能力”，而是另一种钱包范式：

**如果 Reactive Network 提供了事件驱动执行能力，那么钱包就不应该只保存私钥和余额。钱包还应该保存用户意图，并在正确事件发生时持续执行。**

因此，WillLead 的核心不是“给钱包加自动化”，而是把 **intent**、**runtime state** 和 **event-driven execution** 设计成钱包本体的一部分。

这个项目的提交重点不是功能堆叠，而是验证一个判断：

**Reactive Network 不只是给现有应用增加自动化能力，它也可能成为一类新钱包和新消费应用的执行底座。**

## 项目核心

传统钱包是被动的：

- 用户回来
- 打开前端
- 重新连接钱包
- 再签一次名

WillLead 试图把这个模式改成：

- 用户先把 intent 保存到自己的 autonomous wallet
- Reactive contract 监听源链事件
- Reactive Network 把 callback 路由到目标侧
- 目标侧 autonomous wallet 按已保存 intent 自动执行

换句话说，WillLead 把钱包理解成：

- 一个保存 intent 的链上主体
- 一个拥有 runtime 状态的执行单元
- 一个原生接入 Reactive Network 事件模型的钱包原型
- 一个可继续演化成开发者参考架构的最小实现

## 为什么这个项目必须用 Reactive Network

这个用例里，Reactive Network 不是装饰，而是钱包模型成立的前提。

如果没有 Reactive Network，这个系统会退化成：

- 链下 bot 轮询 origin 事件
- 链下服务决定什么时候转发和执行
- 钱包本身仍然是被动的
- 自动化能力不属于钱包，而属于外挂脚本

而在 WillLead 中：

- Reactive contract 真正监听 EVM 事件
- 监听到事件后自动触发 callback
- callback 被路由到目标 autonomous wallet
- 钱包按照链上已保存的 intent 执行

所以这个项目的重点不是“钱包支持自动化”，而是：

**WillLead 是一个按 Reactive Network 运行方式来设计的钱包原型，并且可以作为 `Reactive-native wallet` 方向的参考实现。**

## 已验证的三条关键路径

### 1. Raw Signal Path

最基础的闭环：

`emitSignal(...) -> Reactive listener -> wallet callback -> destination execution`

已验证交易：

- Origin signal  
  `0xae457bbcb7822be50027c9d31ed392aa52faad45f1c431d28130b7bfad9fa7d3`
- Destination execution  
  `0x8de1684ceafaf6293f5d098f6f690953849f1a9c14f81cf8f4e9a2e3eb0a7584`

### 2. Mirrored Intent + Permissionless `poke()` Path

这条路径更接近产品形态：

- 用户在目标钱包保存 intent
- operator 把 intent 镜像到源链 `WillLeadSignalEmitter`
- keeper 或脚本只需要调用 `poke(wallet, nonce)`
- Reactive Network 自动派发 callback
- 目标钱包按已保存的 intent 执行

已验证交易：

- Intent configured  
  `0xd2c178ea2a913de8d2753d39cb30064ea28525c26ce9194197d0f2bfe908d1e1`
- Origin permissionless poke  
  `0x6eb2c2db96dba97c5f75c5fcb6c515e5f2a3794c98e1f6c17054b95af2e4d5a9`
- Reactive dispatch  
  `0x615eed2c1948971dbe5bf3f73d42e48bdc943b4c676d4fce8ceda124e7730e5f`
- Destination execution  
  `0x5e01719af3cfad116144118372cc5d6a69e0141ca5ece0a41e7de3b27cf77abe`

### 3. Real Protocol Event -> Wallet-Funded Faucet Path

这是项目最重要的亮点之一。

这条路径不是由你自己写的 demo event 驱动，而是由 **真实上游协议事件** 触发：

- 监听的是 **Uniswap Sepolia** 上真实存在的 live v3 pools
- 触发事件是 `Swap`
- Reactive listener 收到真实协议事件后，直接把 callback 打到 autonomous wallet
- autonomous wallet 用自己的执行余额调用官方 faucet `request(address)`

也就是说，这条路径证明了两件事：

- WillLead 不只是能响应自己发的 demo event
- WillLead 真的能对外部协议世界发生的事件作出反应

这也是 `Reactive-native wallet` 叙事里最有说服力的部分之一，因为它把平台能力和真实消费级产品形态连接了起来。

已验证交易：

- Source swap  
  `0xec408d555a87a07db58d5de6e72dbb3a86b3b71394fd53198ff1aea7d0d0302a`
- Destination faucet request  
  `0xa38a1ec5571ae27d3aa813e3ae6f1c41f3d2bd056eb9b4d254ca283580606ff9`

## 部署后完整工作流

1. 用户连接 controller wallet。
2. 前端通过 `WillLeadWalletFactory` 发现或创建该用户对应的 autonomous wallet。
3. 用户把 transfer intent 或 swap intent 保存到 autonomous wallet。
4. operator 把当前 transfer intent 镜像到源链 `WillLeadSignalEmitter`。
5. 源链事件发生：
   - 可以是 raw signal
   - 可以是 permissionless `poke(wallet, nonce)`
   - 也可以是真实协议事件，例如被监听的 Uniswap Sepolia `Swap`
6. Reactive contract 在 Reactive Network 上接收到源链事件。
7. Reactive contract 生成 callback payload，并把 callback 路由到目标侧 autonomous wallet。
8. autonomous wallet 校验 callback，并按已保存 intent 执行：
   - 固定转账
   - 或 wallet-funded faucet request
9. 前端刷新状态并展示 proof：
   - `Origin Signal`
   - `Reactive Callback`
   - `Destination Execution`

## 合约清单

### Origin Contract

- `WillLeadSignalEmitter`
  保存 mirrored intent，并在 raw signal 或 `poke()` 路径下发出 `StrategySignal`

### Reactive Contracts

- `WillLeadReactiveListener`
  监听 `StrategySignal`，用于 transfer intent 路径
- `WillLeadMultiSourceSwapListener`
  监听多条真实 Sepolia swap 来源，用于 swap intent 路径
- `WillLeadPoolSwapListener`
- `WillLeadRoutePoolSwapListener`
- `WillLeadUniswapV4SwapListener`
- `WillLeadWalletTransferListener`

### Destination Contracts

- `WillLeadWallet`
  每个用户对应一只 autonomous wallet，保存 transfer intent、swap intent、runtime 状态，并在 callback 到达时真正执行
- `WillLeadWalletFactory`
  创建并发现 owner 对应的 autonomous wallet
- `WillLeadReactiveFaucetIntent`
  仓库中保留的旧版独立 faucet intent 合约，用于早期路径和兼容性验证

## 已部署合约地址

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

当前监听的真实 Sepolia pools：

- fee 100: `0xFeEd501c2B21D315F04946F85fC6416B640240b5`
- fee 500: `0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1`
- fee 3000: `0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50`
- fee 10000: `0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47`
- Circle Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Sepolia WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

## 为什么这个项目值得看

这个项目最重要的不是“做了一个钱包 UI”，而是它把“Reactive Network 原生钱包”这个想法做成了可以验证的最小原型。

它验证了三件事：

- intent 可以变成钱包的一等状态，而不是前端临时输入
- Reactive Network 可以让钱包在前端离线后继续执行
- 真实上游协议事件可以直接触发 autonomous wallet，而不是只靠你自己发的 demo event

如果把传统钱包总结成：

**“用户点一次，钱包动一次。”**

那么 WillLead 想证明的是：

**“用户定义一次，钱包在正确事件到来时持续执行。”**

而进一步说，WillLead 想表达的是：

**Reactive Network 不只是给现有 dApp 增加自动化能力，它也可能催生一种新的钱包范式。**

## 生态价值

从生态角度看，WillLead 的价值不只是一个独立 demo，而是它可以作为下面这些方向的参考起点：

- `Reactive-native wallet` 的参考实现
- 面向开发者的 intent-driven consumer app 参考架构
- 解释 `origin -> reactive -> destination` 执行模型的教学案例
- 展示“真实协议事件如何直接驱动用户侧产品”的平台案例

对 Reactive Network 而言，这个项目更像一个可以继续沉淀的产品范例，而不是一次性的黑客松脚本集合。

## 为什么值得继续支持

如果这个方向继续推进，WillLead 的价值不仅在于把现有闭环跑通，还在于它能够回答更大的生态问题：

- 钱包如何把 Reactive execution 作为默认能力，而不是外挂功能
- intent 如何成为钱包和消费应用的一等状态
- 真实协议事件如何成为用户侧应用的直接触发器
- Reactive Network 如何从基础设施能力，演进为开发者可复用的产品范式

因此，这个项目值得继续支持的原因是：

- 它已经证明核心闭环成立，不是纯概念
- 它提供了一个容易传播和复用的产品方向
- 它天然适合沉淀成文档案例、starter、workshop 示例或参考实现

## 下一阶段里程碑

WillLead 的下一阶段目标不是简单扩功能，而是把这个方向推进成更成熟的 `Reactive-native wallet` 参考实现。

优先里程碑包括：

- 多 intent wallet 架构
- 更多真实上游协议事件模板，而不只是一条 swap 路径
- 更稳定的 operator / keeper 部署形态
- 更完整的 proof、历史与失败恢复表达
- 面向开发者的参考文档与可复用模块沉淀

## 仓库结构

```text
contracts/
  src/      smart contracts
  script/   deployment, funding, sync, proof, and demo scripts
  test/     Foundry tests
frontend/
  src/      UI, wallet state, execution dashboard, proof panel
```

## 验证与复现

关键脚本：

- `contracts/script/deploy-local.sh`
- `contracts/script/create-wallet.sh`
- `contracts/script/configure-intent.sh`
- `contracts/script/sync-listener-subscription.sh`
- `contracts/script/fund-reactive-listener.sh`
- `contracts/script/fund-callback.sh`
- `contracts/script/poke-signal.sh`
- `contracts/script/collect-proof.sh`
- `contracts/script/demo-readiness.sh`

运行顺序与演示流程可直接参考：

- [Demo_Runbook.md](./Demo_Runbook.md)

合约测试：

```bash
forge test --offline
```

前端构建：

```bash
cd frontend
npm run build
```

## 结论

WillLead 不是在证明“钱包也可以调用 Reactive Network”。

它真正想证明的是：

- 钱包可以原生围绕 Reactive Network 的事件驱动执行模型来设计
- intent 可以成为钱包的核心状态
- autonomous wallet 可以在前端离线后继续响应链上世界
- 真实协议事件可以直接成为钱包执行的触发条件

更进一步说，WillLead 想证明：

- `Reactive-native wallet` 是一个值得继续探索的产品方向
- 这个方向可以沉淀成面向开发者和生态的参考实现
- Reactive Network 有机会支持一类新的 consumer application architecture，而不仅仅是给现有系统加自动化

如果传统钱包的默认假设是“用户在线时，钱包才行动”，  
那么 WillLead 的原型假设是：

**钱包应该是一个面向 Reactive Network 原生设计的、能够持续执行用户意图的链上主体。**
