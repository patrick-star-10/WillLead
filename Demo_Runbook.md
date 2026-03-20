# WillLead Demo Runbook

## Goal

用最短路径证明这句话：

**WillLead keeps executing user intent onchain even after the frontend goes offline.**

## Prerequisites

确保下面这些已经完成：

- `.env` 已配置
- `./contracts/script/verify-env.sh` 通过
- `./contracts/script/deploy-local.sh` 已部署三份合约
- `./contracts/script/verify-deployments.sh` 通过
- `./contracts/script/sync-listener-subscription.sh` 已确认当前 ReactVM 订阅的是本次部署出来的 signalEmitter
- `./contracts/script/fund-callback.sh` 已给 callback proxy 充值
- `./contracts/script/configure-intent.sh <token> <recipient>` 已配置 intent
- `./contracts/script/sync-frontend-env.sh` 已同步前端环境
- `./contracts/script/demo-readiness.sh` 返回 `readiness=ok`
- 前端已启动：`cd frontend && npm run dev`

## Demo Path

### 1. 打开前端并展示初始状态

展示这几个字段：

- wallet address
- runtime status
- executed count
- automation credit
- proof panel 当前为空或只有旧记录

### 2. 说明用户 intent

一句话说明：

“这个钱包已经在链上保存了一条 fixed transfer intent，当源链 signal 到来时，它会自动执行，不依赖前端常驻。”

### 3. 关闭前端或断网

这里要明确口径：

- 离线的是用户前端
- 不是后端 bot 继续替你点按钮

### 4. 在终端触发源链事件

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

### 5. 展示三段证据

运行：

```bash
./contracts/script/collect-proof.sh
```

你要讲的证据顺序是：

1. `Origin Signal`
2. `Reactive Callback`
3. `Destination Execution`

如果前端里已经配置了 explorer base url，也可以直接展示 Proof Panel 里的三个链接。

### 6. 重新打开前端

展示：

- executed count 已增加
- last executed at 已更新
- wallet balance 已变化
- proof panel 出现新的 origin / reactive / destination 证据

## Fast Recovery

如果 demo 临场出问题，先跑：

```bash
./contracts/script/status-snapshot.sh
```

重点看：

- callback proxy 的 `reserves` / `debts`
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

“This is not a wallet with optional automation. It is a wallet designed to react by default, and it keeps executing user intent after the frontend goes offline.”
