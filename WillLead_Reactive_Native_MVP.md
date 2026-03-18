# WillLead Reactive-Native Wallet MVP

文档时间：2026-03-18

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

## 3. MVP 范围

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
