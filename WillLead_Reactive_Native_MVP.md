# WillLead Reactive-Native Wallet MVP

文档时间：2026-03-22

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
   真实链路本身已经在当前仓库地址上跑通，而且现在不是单一闭环，而是两条真实执行路径：  
   `Sepolia signal -> Reactive Lasna runtime -> Sepolia execution`  
   `Sepolia signal -> Reactive Lasna runtime -> Lasna execution`  
   当前还缺的是更适合提交黑客松或对外展示的稳定 proof 产物、截图和 runbook 固化。

2. 钱包资产视图还不完整  
   目前前端已经区分 `controller wallet` 与 `autonomous wallet`，并且已经支持：
   - 原生资产展示
   - 当前 intent token 展示
   - 手动添加 watched ERC20  
   但离“钱包”还差：
   - 自动发现更多 token
   - 更清楚的 token metadata 展示
   - 更完整的 portfolio 视图

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
- 钱包工厂已实现，可按 owner 自动发现或创建 autonomous wallet
- 前端可配置单条 transfer intent
- 前端已支持 `Native Asset / ERC20 Token` 两种 intent 资产模式
- listener 可监听 signal 并构造 callback
- wallet 可接收 callback 并执行固定金额转账
- 前端可展示 runtime / automation credit / proof
- wallet 已在链上声明并暴露自己的 runtime route（listener / emitter / source chain / destination chain / topic0）
- 前端已支持 execution environment 切换，当前可在 `Sepolia Execution / Lasna Execution` 之间切换管理不同 autonomous wallet
- Lasna 已不只是 runtime network，而是真实 execution environment
- `Test Source Event` 已回到 operator relay 路径，不要求用户为 source trigger 再签第二次名
- 前端已支持 watched ERC20，controller wallet 与 autonomous wallet 都可展示当前执行环境下的 ERC20 余额
- 脚本可完成 deploy / bootstrap / readiness / demo cycle
- operator service 已可自动同步 mirrored intent、补 listener runtime 资金、清理 debt、恢复订阅并保持 listener armed
- source side 已支持 permissionless `poke(wallet, nonce)`，不再要求每次重填 signal 参数

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

4. `protocol operator + mirrored intent + permissionless poke()` 路径已经真实跑通  
   当前版本不再只是“手工把完整 signal 参数重新打一遍”。更接近正式产品的路径已经成立：
   - destination wallet 保存 intent
   - protocol operator 把 intent 镜像到 origin emitter
   - keeper 或脚本只需要调用 `poke(wallet, nonce)`
   - Reactive runtime 把事件继续派发到 destination callback

5. 用户视角已经接近“一次签名，后续不再参与”  
   用户当前只需要为 setup / intent 保存签一次名。后续真正推动执行的是：
   - protocol operator 维护 mirrored intent 和 listener runtime
   - 外部 keeper / 测试脚本触发 `poke()`
   这仍然不是“100% 全链上自运行”，但已经不是“用户第二次签名触发执行”。

## 3.2 当前稳定能力清单

下面这些能力可以视为当前版本里已经可靠成立、适合下次新对话直接读取的事实。

### 已稳定成立

1. 单 intent transfer wallet 已成立  
   当前 wallet 已稳定支持：
   - 配置单条固定金额转账 intent
   - pause / resume
   - duplicate signal 防护
   - 执行次数上限和 `Exhausted` 状态

2. runtime 状态模型已成立  
   当前前端和合约都已围绕下面这些运行时字段工作：
   - `Inactive / Active / Paused / Exhausted`
   - `lastExecutionNonce`
   - `lastExecutedAt`
   - `lastSignalHash`
   - `executedCount / maxExecutions`

3. controller wallet 与 autonomous wallet 的语义已分离  
   前端当前已经稳定区分：
   - controller wallet
   - autonomous wallet
   - 两边各自的余额和资产视图

4. automation credit 已进入钱包主视图  
   当前已经能展示：
   - callback reserve / debt 的净额语义
   - 最低 automation balance 要求
   - credit 是否健康

5. shared listener runtime 已可被系统自动维护  
   当前 operator service 已可稳定完成：
   - listener funding
   - `coverDebt()`
   - subscription 检查与补齐
   - resume listener

6. source-side mirrored intent 已成立  
   当前 source emitter 不再只是 raw event 工具，而是会保存 mirrored intent。
   这意味着：
   - 外部触发不需要再每次重填 `token / recipient / amount`
   - signal 参数来自链上镜像状态，而不是临时手工拼装

7. permissionless `poke()` 已成立  
   当前 keeper 或脚本只需提供：
   - `wallet`
   - `executionNonce`
   就能触发 source signal。

8. 两条真实闭环都已验证过  
   当前仓库已经验证过：
   - 原始 raw signal 路径
   - 新的 `mirrored intent + permissionless poke()` 路径
   - `Sepolia Execution` 真实闭环
   - `Lasna Execution` 真实闭环

9. 双执行环境已经成立  
   当前 controller wallet 已可在前端切换并管理两套真实 execution environment：
   - `Sepolia Execution`
   - `Lasna Execution`  
   这不是单纯的资产视图切换，而是切换当前管理的 autonomous wallet、execution destination、runtime route、proof 和 operator runtime。

10. runtime route 已变成钱包一等状态  
   当前不是从 listener 旁路推断钱包绑定关系，而是 wallet 自己在链上声明：
   - `listener`
   - `signalEmitter`
   - `sourceChainId`
   - `destinationChainId`
   - `strategySignalTopic0`  
   这使得 Reactive runtime 更像钱包本体的一部分，而不是外部脚本附属物。

## 3.2.1 当前已实现的方法

为了更接近“Reactive-native wallet”，当前版本已经不是只靠脚本把 callback 跑通，而是采用了下面这套方法路径：

1. controller wallet 和 autonomous wallet 分层  
   controller wallet 负责连接、签名、配置 intent。  
   autonomous wallet 负责持有执行资产、接收 callback、维护 runtime 状态并真正执行。

2. intent 与 runtime route 一起上链  
   当前保存的不只是：
   - token
   - recipient
   - amountPerExecution
   - maxExecutions
   - minAutomationBalance  
   还包括：
   - listener
   - signalEmitter
   - sourceChainId
   - destinationChainId
   - signalTopic0

3. source signal 与 destination execution 解耦  
   当前采用：
   - destination wallet 保存 intent
   - operator 镜像 intent 到 source emitter
   - 外部 keeper 或 operator 只触发 `poke(wallet, nonce)`
   - Reactive runtime 把 signal 派发成目标链 callback

4. single-signature UX 通过 operator relay 落地  
   当前用户只需要为 setup / save intent 签名。  
   测试路径中的 source event 触发已经通过 operator relay 代发，不再要求用户再签第二次。

5. execution environment 分层  
   当前不是只展示一条 execution chain，而是明确支持：
   - `Sepolia Execution`
   - `Lasna Execution`  
   每个 execution environment 都有自己独立的：
   - autonomous wallet
   - runtime route
   - callback reserve
   - proof
   - operator runtime

6. multi-asset MVP 采用 watched token 方法  
   当前没有接入完整 indexer 自动发现 token，而是采用更轻量且可演示的方法：
   - 默认读取原生资产
   - 自动读取当前 intent token
   - 手动添加 watched ERC20  
   这样 controller wallet 和 autonomous wallet 都能在当前 execution environment 下展示 ERC20 余额。

### 当前真实边界

1. 这还不是完全无链下依赖的系统  
   当前仍需要 protocol operator 维护 mirrored intent 和 listener runtime。

2. `poke()` 仍是测试网复现入口，不是真实上游协议事件  
   所以当前更准确的定义是：
   - reactive-native wallet MVP 成立
   - 真实外部事件源 adapter 还没接入

3. intent 模式仍然单一  
   当前可靠成立的是固定金额 transfer intent，不要把当前版本讲成多策略钱包。

## 3.3 修订后的方案主线

为了让方案更贴近“Reactive 原生钱包”，后续实现建议不再只围绕“把 callback 跑通”，而是按下面顺序推进：

1. 先把双执行环境的产品表达讲清楚  
   目标：用户和评委能一眼看懂当前不是“多看一个链”，而是同一个 controller wallet 正在管理两只不同执行链上的 autonomous wallet。

2. 再把 `automation credit` 做成更完整的钱包一级信息  
   目标：用户能看懂自动执行资金够不够、什么时候补过、耗尽会怎样。

3. 再把 `listener / subscription / runtime route` 做成钱包运行时能力  
   目标：用户能看懂这个钱包为什么会对某类 signal 响应，以及当前绑定的是哪条 Reactive route。

4. 再把 asset portfolio 做得更像钱包  
   目标：从当前的 `native + intent token + watched ERC20`，继续推进到更完整的多资产视图。

5. 最后用双真实测试网闭环把“Reactive-native”讲成立  
   目标：不仅能看，还能证明前端离线后，Sepolia 与 Lasna 两条 execution environment 都能继续执行。

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

这一版之后，职责已经不再只是“稳定发出可监听事件”，而是：

- 保存由 protocol operator 从 destination wallet 镜像过来的 intent
- 提供 raw `emitSignal(...)` 作为调试入口
- 提供 permissionless `poke(wallet, nonce)` 作为更接近正式产品的外部触发入口

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

新增的 source-side 状态建议统一围绕下面的镜像结构理解：

```solidity
struct MirroredIntent {
    bool active;
    address token;
    address recipient;
    uint256 amountPerExecution;
    uint256 maxExecutions;
}
```

对应运行语义是：

- operator 负责 `syncIntent(...)`
- keeper 或脚本负责 `poke(wallet, nonce)`
- 合约自己持有当前生效的 signal 参数

这部分目前仍不接 oracle，不接真实市场条件。

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
- 当前 execution environment

### Intent Setup

必须展示：

- asset type（Native / ERC20）
- recipient
- amount per execution
- max executions
- min automation balance
- current runtime status
- runtime route

### Execution Dashboard

必须展示：

- runtime status
- executed count / max executions
- last executed at
- last execution nonce
- last signal hash
- 最近一次执行事件
- 目标链余额变化
- operator service 状态
- 当前 runtime route

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

这一版 demo 不能只讲“自动转账”，要讲“这是一个默认可响应事件的钱包”，并且要明确区分两种不同成熟度的触发方式：

- raw signal：更像底层调试入口
- mirrored intent + `poke()`：更接近正式产品的对外叙事

推荐 demo 话术：

1. 用户创建 WillLead wallet。
2. 用户在 `Sepolia Execution` 或 `Lasna Execution` 里选择当前要管理的 autonomous wallet。
3. 用户配置一个 onchain intent，并设置最小 automation credit 要求。
4. 前端关闭。
5. protocol operator 已经把 intent 镜像到 source emitter，并保持 listener armed。
6. 外部 keeper 或脚本在源链触发 `poke(wallet, nonce)`。
7. Reactive Network 继续驱动目标链钱包执行。
8. 用户重新上线后，钱包直接展示新的 runtime 状态、proof 和执行结果。

评委需要看到的证据：

- 源链事件
- Reactive callback
- 目标链执行交易
- Sepolia Execution 与 Lasna Execution 的环境切换
- 前端关闭前后的状态差异

## 9. 成功标准

满足下面条件，就可以把它称为当前这版 `Reactive-native wallet MVP`：

1. 用户能在前端配置一次 intent。
2. intent 被链上保存，不依赖前端在线。
3. 前端关闭后，外部事件仍能驱动目标链执行。
4. 钱包能展示自己的 runtime 状态，而不是只展示“执行过一次”。
5. 前端能展示 automation credit 语义。
6. 前端能在 `Sepolia Execution / Lasna Execution` 之间切换并管理不同 autonomous wallet。
7. 用户重新上线后，能看到完整执行证据。
8. 用户不需要为 source event 再签第二次名；后续执行由 operator + keeper/runtime 推动。

## 10. 下一阶段优先级

当前基础闭环已经成立，后续优先级不再是“先把 callback 跑通”，而是：

1. 真实事件源 adapter  
   至少接 1 个真实上游协议事件，替代测试网里的 `poke()` 复现入口。

2. 更完整的 multi-asset portfolio  
   从当前 watched ERC20 机制，升级到更像真实钱包的资产发现与展示。

3. 条件引擎  
   从“收到事件就执行”升级成“满足条件才执行”。

4. 失败与原因解释  
   让用户能看懂：
   - 为什么执行了
   - 为什么没执行
   - 卡在 source、listener、callback 还是资金层

5. protocol operator 长期在线化  
   从“本机脚本”升级成部署方长期在线服务。

6. intent 模型扩展  
   在保证当前单 intent 稳定的前提下，再扩展更多计划模式。

## 11. 结论

这一版的关键不是“多做几个策略”，而是把下面这句话做实：

**WillLead is not a wallet that can optionally react. It is a wallet that is built to react by default.**
