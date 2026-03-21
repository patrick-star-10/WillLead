# WillLead Reactive-Native Wallet MVP

文档时间：2026-03-21

## 1. 目标重定义

这一版不再把 WillLead 定义为“一个会被 Reactive Network 触发的钱包 demo”，而是定义为：

**一个以事件驱动自动执行为默认运行方式的 Reactive-native wallet 最小版本。**

一句话版本：

**WillLead is a reactive-native wallet prototype that keeps executing onchain user intent after the frontend goes offline.**

这里的“原生”不是指功能很多，而是指 Reactive 执行能力已经成为钱包本身的默认能力，而不是外挂脚本。

## 2. 这一版必须具备的原生性质

为了让这个 MVP 能被合理地称为 `Reactive-native wallet`，最少要满足下面 5 条：

1. 用户意图保存在链上，由钱包持有，不依赖前端在线。
2. 钱包默认接受“事件驱动执行”，而不是默认只接受手动点击。
3. 自动执行有明确的运行状态，而不是只做一次 callback 演示。
4. 自动执行有明确的资金语义，前端能展示 callback 所需的 automation credit。
5. 钱包能解释“为什么被触发、执行了几次、最后一次结果是什么”。

## 2.1 当前版本还缺的原生能力

基于现在已经实现的仓库，WillLead 已经具备 `Reactive-enabled wallet prototype` 的形状，但距离“更像原生钱包”还差下面这些能力。

### 必补缺口

1. 真实测试网闭环的产品化证据留存  
   真实链路本身已经在当前仓库地址上跑通，主链路是：  
   `Sepolia signal -> Reactive Lasna runtime -> Sepolia execution`  
   当前还缺的是更适合提交黑客松或对外展示的稳定 proof 产物、截图和 runbook 固化。

2. 钱包资产视图还不完整  
   目前前端已经区分 `EOA balance` 与 `autonomous wallet balance`，但离“钱包”还差：
   - 多资产展示
   - 更清楚的 token metadata 展示

3. 自动执行 credit 还不是完整钱包能力  
   现在已经有 `top up automation credit`，但还缺：
   - credit 来源和用途说明
   - credit 耗尽后的明确状态
   - credit top-up 历史或最近一次补充记录

4. 订阅管理还不是钱包的一等能力  
   现在 Reactive subscription 主要由 listener 承担，钱包端还缺：
   - 当前订阅来源说明
   - 订阅开关的产品化表达
   - 对“这个钱包为何会响应这个 signal”的可解释性

5. 失败处理还不够钱包级  
   当前有 pause / skip / duplicate 防护，但还缺：
   - callback 失败原因归类
   - recover / retry 策略
   - credit 不足、资产不足、intent 不匹配等错误的前端可见状态

### 可增强缺口

1. 本地网页钱包已经有创建 / 导入助记词能力，但还不是成熟的钱包体验  
   还缺：
   - 助记词确认流程
   - 导出 / 备份提醒
   - 多账户或多钱包切换
   - 明确的 session / persistent wallet 管理

2. Activity 还偏 proof panel，不是完整钱包历史  
   还缺：
   - user action history
   - execution history
   - funding history
   - failed execution history

3. Intent 还是单 intent 模型  
   这对 MVP 是对的，但如果要更像原生钱包，后续要支持：
   - 多 intent
   - intent priority
   - intent 状态筛选
   - intent 模板化

## 3. MVP 范围

这一版把 MVP 拆成三个层级，避免“已经实现的 demo 能力”和“要讲成原生钱包还必须补的能力”混在一起。

### Layer A: 当前已实现的 MVP

- 钱包可连接浏览器钱包
- 钱包可创建 / 导入网页钱包
- 前端可配置单条 transfer intent
- listener 可监听 signal 并构造 callback
- wallet 可接收 callback 并执行固定金额转账
- 前端可展示 runtime / automation credit / proof
- 脚本可完成 deploy / bootstrap / readiness / demo cycle

### Layer B: 必须补齐后才更适合讲成 reactive-native wallet

- 把真实测试网闭环整理成稳定证据和提交材料
- 让 automation credit 成为更完整的钱包能力展示
- 明确 listener / subscription 与 wallet 的关系
- 明确失败、暂停、耗尽、跳过的状态说明

### Layer C: 后续扩展

- 多 intent
- DCA 包装层
- 多钱包 / 多账户
- 更完整的钱包历史
- 更完整的 token portfolio
- 更成熟的网页钱包备份与恢复体验

### 必须做

- 一个可持有资产的 `WillLeadWallet`
- 一条最小 intent：固定金额转账
- 一个源链事件触发器 `WillLeadSignalEmitter`
- 一个 Reactive 监听器 `WillLeadReactiveListener`
- 一个最小前端，展示钱包、intent、执行状态、automation credit

### 不做

- 多 intent 并行系统
- 真实价格源
- 复杂 DCA 计算
- 钱包工厂
- 社交恢复、多签、AA 全套能力
- 完整执行历史索引系统

说明：如果后面还有时间，DCA 可以作为固定金额转账的包装层追加，但第一版不要先做。

## 3.1 当前进度更新

当前仓库已经完成的关键点：

1. `connected wallet` 与 `autonomous wallet` 资产语义已经在前端分开显示  
   这部分不再是方案缺口，而是已实现能力。

2. 真实测试网闭环已经在当前地址上跑通过  
   需要保留的不是“能不能跑通”，而是“如何把 proof 和 demo 口径写清楚”。

3. Reactive listener runtime funding 已经成为系统级前置条件  
   这次联调暴露出的核心问题不是 subscription，而是 listener 自身欠费。现在脚本和 operator service 已经会自动补这层运行资金并清理 debt。

## 3.2 修订后的方案主线

为了让方案更贴近“Reactive 原生钱包”，后续实现建议不再只围绕“把 callback 跑通”，而是按下面顺序推进：

1. 先把 `connected wallet` 和 `destination wallet contract` 资产语义彻底分开  
   目标：用户一眼能看懂自己当前连接的钱包和执行 intent 的钱包是不是同一个地址。

2. 再把 `automation credit` 做成钱包一级信息  
   目标：用户能看懂自动执行资金够不够、什么时候补过、耗尽会怎样。

3. 再把 `listener / subscription` 做成钱包运行时能力  
   目标：用户能看懂这个钱包为什么会对某类 signal 响应。

4. 最后用真实测试网闭环把“Reactive-native”讲成立  
   目标：不仅能看，还能证明前端离线后 intent 仍继续执行。

## 4. 核心产品模型

### 4.1 Intent 是一等公民

不要在产品表达上继续使用“策略配置”作为主词，统一改成 `intent`。

建议的链上结构：

```solidity
struct IntentConfig {
    bool enabled;
    address token;
    address recipient;
    uint256 amountPerExecution;
    uint256 maxExecutions;
    uint256 executedCount;
}
```

固定金额转账 intent 的语义是：

“当指定 signal 到来时，钱包自动向 recipient 转出 amountPerExecution，最多执行 maxExecutions 次。”

### 4.2 自动执行是钱包运行时的一部分

钱包不只是保存资产和接 callback，还需要暴露最小运行时状态：

```solidity
enum RuntimeStatus {
    Inactive,
    Active,
    Paused,
    Exhausted
}
```

建议状态字段：

```solidity
address public owner;
address public callbackProxy;
address public authorizedRvmId;
IntentConfig public intent;
RuntimeStatus public runtimeStatus;
uint256 public lastExecutionNonce;
uint256 public lastExecutedAt;
bytes32 public lastSignalHash;
uint256 public minAutomationBalance;
```

说明：

- `runtimeStatus` 让这个钱包更像一个可运行系统，而不是一次性 demo 合约
- `minAutomationBalance` 用来表达钱包对自动执行燃料的最低要求
- 实际 callback 资金仍通过官方 `depositTo(wallet)` 进入 callback proxy 体系

### 4.3 可观测性是原生能力的一部分

不要把“最新交易哈希”当作钱包链上状态去存。合约拿不到自身交易哈希，正确做法是发事件，让前端从链上日志或区块浏览器读取。

建议事件：

```solidity
event IntentConfigured(
    address indexed wallet,
    address indexed token,
    address indexed recipient,
    uint256 amountPerExecution,
    uint256 maxExecutions
);

event RuntimeStatusUpdated(address indexed wallet, RuntimeStatus status);

event IntentExecuted(
    address indexed wallet,
    address indexed token,
    address indexed recipient,
    uint256 amount,
    uint256 executionNonce,
    bytes32 signalHash
);

event IntentExecutionSkipped(
    address indexed wallet,
    uint256 executionNonce,
    bytes32 signalHash,
    string reason
);
```

## 5. 合约设计

### 5.1 WillLeadSignalEmitter

职责保持不变：稳定发出可监听事件，模拟“条件满足”。

```solidity
event StrategySignal(
    address indexed wallet,
    address indexed token,
    address indexed recipient,
    uint256 amount,
    uint256 executionNonce,
    uint256 emittedAt
);
```

```solidity
function emitSignal(
    address wallet,
    address token,
    address recipient,
    uint256 amount,
    uint256 executionNonce
) external;
```

这部分不接 oracle，不接真实市场条件。

### 5.2 WillLeadWallet

这个合约是本次 MVP 的中心，不再把它写成“普通钱包 + callback 接收器”，而是写成“带 intent runtime 的最小 reactive-native wallet”。

建议暴露的函数：

```solidity
function configureIntent(
    address token,
    address recipient,
    uint256 amountPerExecution,
    uint256 maxExecutions,
    uint256 minAutomationBalance
) external;

function pauseIntent() external;

function resumeIntent() external;

function callback(
    address token,
    uint256 amount,
    address recipient,
    address signalSender,
    uint256 executionNonce,
    uint256 emittedAt
) external;

function withdraw(address token, uint256 amount, address to) external;
```

`callback(...)` 内部至少做这些检查：

- `msg.sender` 必须是 callback proxy
- `authorizedRvmId` 必须匹配
- `runtimeStatus == Active`
- `intent.enabled == true`
- `intent.executedCount < intent.maxExecutions`
- `executionNonce` 或 `signalHash` 不能重复
- 收款地址和金额必须与 intent 匹配

回调成功后：

- 执行固定金额转账
- 更新 `executedCount`
- 更新 `lastExecutionNonce`
- 更新 `lastExecutedAt`
- 更新 `lastSignalHash`
- 如果达到上限，切换到 `Exhausted`
- 发出 `IntentExecuted`

回调不应因为“重复 signal”或“intent 已暂停”而粗暴地让整个系统不可观测。能明确跳过原因时，优先发 `IntentExecutionSkipped`。

### 5.3 WillLeadReactiveListener

职责不变，但产品表达上要更明确：

- 这是钱包运行时的 Reactive adapter
- 它把源链 signal 转成目标链钱包可执行的 callback payload

建议骨架：

```solidity
function react(LogRecord calldata logRecord) external vmOnly {
    // 1. 校验来源链和来源合约
    // 2. 解析 wallet / token / recipient / amount / executionNonce / emittedAt
    // 3. abi.encodeWithSignature("callback(...)")
    // 4. emit Callback(destinationChainId, wallet, gasLimit, payload)
}
```

callback gas limit 仍建议先固定成 `1_000_000`，优先保证成功率。

## 6. 自动执行资金语义

这一版需要把 callback 资金从“实现细节”提升成“钱包能力的一部分”。

### 正确表达

- 用户不仅在配置 intent，也在给钱包的自动执行能力准备 credit
- 实际链路仍使用官方 callback proxy 的 `depositTo(walletAddress)`

### 前端必须展示

- 当前钱包地址
- 钱包资产余额
- 当前 intent 状态
- `automation credit` 是否充足

说明：

- 如果 callback proxy 能直接读到该钱包的可用余额，前端直接展示真实值
- 如果早期读不到，就至少展示 `minAutomationBalance` 和最近一次 top-up 结果

## 7. 前端设计

仍然只保留 3 个主视图，但内容需要更像“钱包运行面板”。

### Wallet Setup

必须展示：

- 连接钱包
- 创建或绑定 `WillLeadWallet`
- 钱包地址
- 钱包余额
- automation credit 状态

### Intent Setup

必须展示：

- recipient
- amount per execution
- max executions
- min automation balance
- current runtime status

### Execution Dashboard

必须展示：

- runtime status
- executed count / max executions
- last executed at
- last execution nonce
- last signal hash
- 最近一次执行事件
- 目标链余额变化

建议目录结构：

```text
src/
  app/
    App.tsx
  components/
    WalletHeader.tsx
    IntentForm.tsx
    RuntimePanel.tsx
    ProofPanel.tsx
  contracts/
    abi/
    addresses.ts
  hooks/
    useWalletState.ts
    useIntentState.ts
    useExecutionEvents.ts
    useAutomationCredit.ts
  lib/
    wagmi.ts
    viem.ts
  store/
    walletStore.ts
```

## 8. Demo 叙事

这一版 demo 不能只讲“自动转账”，要讲“这是一个默认可响应事件的钱包”。

推荐 demo 话术：

1. 用户创建 WillLead wallet。
2. 用户配置一个 onchain intent，并设置最小 automation credit 要求。
3. 前端关闭。
4. 外部事件在源链发出。
5. Reactive Network 继续驱动目标链钱包执行。
6. 用户重新上线后，钱包直接展示新的 runtime 状态和执行结果。

评委需要看到的证据：

- 源链事件
- Reactive callback
- 目标链执行交易
- 前端关闭前后的状态差异

## 9. 成功标准

满足下面条件，就可以把它称为 `Reactive-native wallet MVP`：

1. 用户能在前端配置一次 intent。
2. intent 被链上保存，不依赖前端在线。
3. 前端关闭后，外部事件仍能驱动目标链执行。
4. 钱包能展示自己的 runtime 状态，而不是只展示“执行过一次”。
5. 前端能展示 automation credit 语义。
6. 用户重新上线后，能看到完整执行证据。

## 10. 实现优先级

建议按下面顺序做，避免“原生表达”拖累交付：

Day 1:

- 定义 `IntentConfig`
- 定义 `RuntimeStatus`
- 写 `WillLeadWallet` 骨架

Day 2:

- 写 `SignalEmitter`
- 写 `ReactiveListener`
- 跑通源链事件到 callback

Day 3:

- 在 `callback(...)` 里真正执行固定金额转账
- 写去重逻辑
- 写状态切换逻辑

Day 4:

- 接 `depositTo(wallet)`
- 前端读取 automation credit
- 补 pause / resume / withdraw

Day 5:

- 前端完成三个视图
- 接执行事件展示

Day 6-7:

- 稳定 demo
- 准备交易哈希、浏览器链接、录屏

## 11. 结论

这一版的关键不是“多做几个策略”，而是把下面这句话做实：

**WillLead is not a wallet that can optionally react. It is a wallet that is built to react by default.**
