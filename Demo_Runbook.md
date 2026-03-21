# WillLead Demo Runbook

## Latest Verified Run

截至 2026-03-21，当前仓库和这组测试网地址已经验证过一条真实闭环：

- origin signal：`0xae457bbcb7822be50027c9d31ed392aa52faad45f1c431d28130b7bfad9fa7d3`
- destination execution：`0x8de1684ceafaf6293f5d098f6f690953849f1a9c14f81cf8f4e9a2e3eb0a7584`

这次验证里还额外确认了一个关键运行条件：

- Reactive listener 自身必须有足够的 runtime balance，并且 vendor debt 需要被 `coverDebt()`
- 现在这一步已经进入 `fund-reactive-listener.sh`、`deploy-local.sh`、`bootstrap-demo.sh` 和 operator service 的默认流程

## Goal

用最短路径证明这句话：

**WillLead keeps executing user intent onchain even after the frontend goes offline.**

## Prerequisites

确保下面这些已经完成：

- `.env` 已配置
- `./contracts/script/verify-env.sh` 通过
- `./contracts/script/deploy-local.sh` 已部署 signal emitter / shared listener / wallet factory
- `./contracts/script/create-wallet.sh` 已为当前 owner 创建或恢复 autonomous wallet
- `./contracts/script/verify-deployments.sh` 通过
- `./contracts/script/sync-listener-subscription.sh` 已确认当前 ReactVM 订阅的是本次部署出来的 signalEmitter
- `./contracts/script/fund-reactive-listener.sh` 已给 Reactive listener 补运行资金并覆盖当前 debt
- `./contracts/script/fund-callback.sh` 已给 callback proxy 充值
- `./contracts/script/configure-intent.sh <token> <recipient>` 已配置 intent
- `./contracts/script/sync-frontend-env.sh` 已同步前端环境
- `./contracts/script/demo-readiness.sh` 返回 `readiness=ok`
- 如需让前端签完 intent 后自动恢复 listener，可在 operator 终端额外启动 `./contracts/script/start-operator-service.sh`
- 这条 operator service 现在也会自动补 Reactive listener 的 runtime 资金并清理 debt
- 前端已启动：`cd frontend && npm run dev`

## Demo Path

### 1. 打开前端并连接 owner 钱包

这里先讲清楚口径：

- 用户连接的是 controller wallet
- 前端会通过 wallet factory 发现这位 owner 对应的 autonomous wallet
- 自动执行真正发生在 autonomous wallet 上，不发生在当前连接的 EOA 上

如果当前 owner 还没有 autonomous wallet，可以在前端点击 `Initialize Autonomous Wallet`，或者先执行：

```bash
./contracts/script/create-wallet.sh
```

### 2. 展示初始状态

展示这几个字段：

- connected wallet
- autonomous wallet address
- runtime status
- executed count
- automation credit
- proof panel 当前为空或只有旧记录

### 3. 说明用户 intent

一句话说明：

“这只 autonomous wallet 已经在链上保存了一条 fixed transfer intent，当源链 signal 到来时，它会自动执行，不依赖前端常驻。”

### 4. 关闭前端或断网

这里要明确口径：

- 离线的是用户前端
- 不是后端 bot 继续替你点按钮

### 5. 在终端触发源链事件

这里要明确口径：

- 这一步是 external signal operator 在触发，不是用户自己又签了一次钱包操作
- 演示时不要使用 owner/controller wallet 再去点前端按钮发 signal
- 最好使用独立 operator key 或终端脚本来触发 source event

```bash
./contracts/script/emit-signal.sh <token> <recipient> <amountPerExecution> <executionNonce>
```

如果你想把前后状态和证据一起跑：

```bash
./contracts/script/demo-cycle.sh <token> <recipient> <amountPerExecution> <executionNonce>
```

如果你已经单独触发了 signal，也可以单独等待执行完成：

```bash
./contracts/script/wait-for-execution.sh <executionNonce>
```

### 6. 展示三段证据

运行：

```bash
./contracts/script/collect-proof.sh
```

你要讲的证据顺序是：

1. `Origin Signal`
2. `Reactive Callback`
3. `Destination Execution`

如果前端里已经配置了 explorer base url，也可以直接展示 Proof Panel 里的三个链接。

### 7. 重新打开前端

展示：

- executed count 已增加
- last executed at 已更新
- wallet balance 已变化
- activity 里出现新的 origin / reactive / destination 证据
- autonomous wallet 仍然归属于刚才连接的 owner

## Fast Recovery

如果 demo 临场出问题，先跑：

```bash
./contracts/script/status-snapshot.sh
```

重点看：

- callback proxy 的 `reserves` / `debts`
- reactive listener 的 balance / debt
- listener 是否 `paused`
- 当前 ReactVM 订阅是否命中了现在这套 `signalEmitter`
- wallet 的 `lastExecutionNonce`
- wallet 的 `lastSignalHash`

如果你想先判断是不是还能继续演示，直接跑：

```bash
./contracts/script/demo-readiness.sh
```

## Judge Narrative

推荐一句话叙事：

“This is not a wallet with optional automation. Each user gets their own autonomous wallet, and a shared reactive runtime keeps executing that wallet's intent after the frontend goes offline.”
