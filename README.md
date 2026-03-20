# WillLead

WillLead 是一个按照 [WillLead_Implementation_Guide.pdf](/Users/wx/Desktop/WillLead/WillLead_Implementation_Guide.pdf) 和 [WillLead_Reactive_Native_MVP.md](/Users/wx/Desktop/WillLead/WillLead_Reactive_Native_MVP.md) 搭建的 `reactive-native wallet` MVP 骨架。

当前目标不是一次性做完整钱包，而是先把下面这条链路做通：

`SignalEmitter -> ReactiveListener -> callback -> Wallet intent execution -> Frontend state refresh`

## 项目结构

```text
contracts/
  script/
  src/
frontend/
  src/
```

## 合约范围

- `WillLeadWallet`
  保存单条 intent、接收 callback、执行固定金额转账、记录运行时状态
- `WillLeadWalletFactory`
  在目标链上为每个 owner 创建并发现对应的 autonomous wallet
- `WillLeadSignalEmitter`
  在源链发出 `StrategySignal`
- `WillLeadReactiveListener`
  基于官方 `reactive-lib` 订阅源链事件，并生成目标链 callback payload

说明：

- `WillLeadReactiveListener` 现在已经切到本地 vendor 的官方 `reactive-lib` 最小依赖和 `AbstractPausableReactive` 抽象类
- callback payload 的第一个 `address` 参数按官方模式保留为 `address(0)` 占位，实际回调时由 Reactive 基础设施覆写成 RVM ID
- `automation credit` 的产品语义已经进入前端和钱包配置，但实际 callback 资金准备仍然要通过官方 `depositTo(wallet)` 路径完成

## 前端范围

前端先按 PDF 保留 3 个主视图：

- `Wallet Setup`
- `Intent Setup`
- `Execution Dashboard`

现在的前端已经接了 `viem` 的实现入口：

- 可连接浏览器钱包
- 可通过 `WillLeadWalletFactory` 按 `ownerAddress` 发现或初始化 autonomous wallet
- 可向目标链钱包调用 `configureIntent / pauseIntent / resumeIntent`
- 可向源链信号合约调用 `emitSignal`
- 可读取目标链钱包状态和 callback proxy 的 reserves / debts

## 本地开发

### 1. 合约

```bash
forge build
```

从空环境开始的推荐顺序：

```bash
cp .env.example .env
./contracts/script/verify-env.sh
./contracts/script/deploy-local.sh
./contracts/script/verify-deployments.sh
./contracts/script/sync-listener-subscription.sh
./contracts/script/fund-callback.sh
./contracts/script/configure-intent.sh <token> <recipient>
./contracts/script/sync-frontend-env.sh
./contracts/script/demo-readiness.sh
```

如果你想压成一条命令：

```bash
./contracts/script/bootstrap-demo.sh <token> <recipient>
```

其中：

- `AUTHORIZED_RVM_ID` 应该填部署 `WillLeadWallet` 和 `WillLeadReactiveListener` 的同一个 EOA 地址
- `deploy-local.sh` 现在会部署共享的 `WillLeadWalletFactory`，然后为当前 `OWNER_PRIVATE_KEY` 对应的 owner 自动创建第一只 wallet
- listener 本身不再把该值写进 callback payload，payload 里使用 `address(0)` 让 Reactive 在真实 callback 时填充 RVM ID
- `sync-listener-subscription.sh` 会直接检查当前 ReactVM 上是否真的订阅了当前 `signalEmitter + topic0`；如果订阅缺失，它会通过 Reactive system contract 补一次 `subscribeContract(...)`

如果要继续往下做：

1. 接入官方 `reactive-lib`
2. 把当前 vendor 的最小 `reactive-lib` 替换成完整依赖管理方式
3. 增加部署脚本和 Foundry 测试
4. 接 `depositTo(wallet)` 的资金准备流程

当前目录里已经有可直接运行的 shell 脚本：

- [deploy-local.sh](/Users/wx/Desktop/WillLead/contracts/script/deploy-local.sh)
- [verify-env.sh](/Users/wx/Desktop/WillLead/contracts/script/verify-env.sh)
- [bootstrap-demo.sh](/Users/wx/Desktop/WillLead/contracts/script/bootstrap-demo.sh)
- [verify-deployments.sh](/Users/wx/Desktop/WillLead/contracts/script/verify-deployments.sh)
- [configure-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/configure-intent.sh)
- [pause-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/pause-intent.sh)
- [resume-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/resume-intent.sh)
- [emit-signal.sh](/Users/wx/Desktop/WillLead/contracts/script/emit-signal.sh)
- [collect-proof.sh](/Users/wx/Desktop/WillLead/contracts/script/collect-proof.sh)
- [demo-cycle.sh](/Users/wx/Desktop/WillLead/contracts/script/demo-cycle.sh)
- [demo-readiness.sh](/Users/wx/Desktop/WillLead/contracts/script/demo-readiness.sh)
- [wait-for-execution.sh](/Users/wx/Desktop/WillLead/contracts/script/wait-for-execution.sh)
- [fund-callback.sh](/Users/wx/Desktop/WillLead/contracts/script/fund-callback.sh)
- [sync-listener-subscription.sh](/Users/wx/Desktop/WillLead/contracts/script/sync-listener-subscription.sh)
- [pause-listener.sh](/Users/wx/Desktop/WillLead/contracts/script/pause-listener.sh)
- [resume-listener.sh](/Users/wx/Desktop/WillLead/contracts/script/resume-listener.sh)
- [set-callback-gas.sh](/Users/wx/Desktop/WillLead/contracts/script/set-callback-gas.sh)
- [status-snapshot.sh](/Users/wx/Desktop/WillLead/contracts/script/status-snapshot.sh)
- [sync-frontend-env.sh](/Users/wx/Desktop/WillLead/contracts/script/sync-frontend-env.sh)

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

我已经在本地执行过：

```bash
npm run build
```

前端当前可以成功打包。

如果你想做现场 demo 排查，`Proof Panel` 现在按 `origin / reactive / destination` 三段展示证据；配好 `VITE_*_EXPLORER_BASE_URL` 后可以直接点到浏览器。

建议在每次正式演示前先跑：

```bash
./contracts/script/demo-readiness.sh
```

这条命令会校验：

- `.env` 和部署地址是否完整
- wallet intent 是否已启用且仍处于 `Active`
- callback reserve 是否高于 wallet 的 `minAutomationBalance`
- reactive listener 是否处于未暂停状态
- 当前 ReactVM 是否已订阅到这次部署出来的 `signalEmitter`
- `frontend/.env.local` 是否已经同步到最新地址

如果你已经触发了 signal，想等到 destination 执行真正落地，而不是固定 `sleep`，可以跑：

```bash
./contracts/script/wait-for-execution.sh <executionNonce>
```

它会轮询 wallet 的 `lastExecutionNonce`、Reactive callback 事件和 destination `IntentExecuted` 事件，直到确认成功或超时。

演示顺序和话术可以直接参考 [Demo_Runbook.md](/Users/wx/Desktop/WillLead/Demo_Runbook.md)。

## 下一步建议

1. 先把 `WillLeadWallet.callback(...)` 的真实调用链在测试里跑通
2. 再接 `WillLeadReactiveListener.react(...)` 的真实 Reactive callback
3. 最后把前端从本地 mock 状态切换到链上读状态
