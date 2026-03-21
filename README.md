# WillLead

WillLead 是一个按照 [WillLead_Implementation_Guide.pdf](/Users/wx/Desktop/WillLead/WillLead_Implementation_Guide.pdf) 和 [WillLead_Reactive_Native_MVP.md](/Users/wx/Desktop/WillLead/WillLead_Reactive_Native_MVP.md) 搭建的 `reactive-native wallet` MVP。

当前目标不是一次性做完整钱包，而是先把下面这条链路做通：

`SignalEmitter -> ReactiveListener -> callback -> Wallet intent execution -> Frontend state refresh`

## 当前进度

截至 2026-03-21，这个 MVP 已经在当前测试网环境里完成了一次真实闭环验证：

- 用户先保存 onchain intent
- shared listener 由 operator/runtime 自动保持在可运行状态
- 用户前端离线后，外部 signal 仍可触发钱包执行
- autonomous wallet 在目标链上完成真实转账，前端重新打开后可读到执行结果

这次最新验证里，关键交易为：

- Reactive listener runtime 修复：`0x8f4c88b60b28120cf16da27bf8886ec75a9376b3e6d3e6a9186f13c3c268d5b1`
- listener `coverDebt()`：`0x2b8f17d53affa24a0033c7a4fdd0c71998f891e3e9198011728cf810b0278d3a`
- origin signal：`0xae457bbcb7822be50027c9d31ed392aa52faad45f1c431d28130b7bfad9fa7d3`
- destination execution：`0x8de1684ceafaf6293f5d098f6f690953849f1a9c14f81cf8f4e9a2e3eb0a7584`

当前系统层面的判断是：

- `intent save -> listener armed -> external signal -> destination execution` 这条主链路已经成立
- controller wallet 和 autonomous wallet 的资产语义已经在前端分开展示
- operator service 已经会自动补 Reactive listener runtime 资金、清理 debt、恢复订阅并 resume listener
- 还没做的是更完整的钱包化体验，而不是基础自动执行闭环

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
- 可展示外部 signal source、listener 路由和执行结果；源链 `emitSignal` 保留给脚本 / operator 侧使用
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
./contracts/script/create-wallet.sh
./contracts/script/verify-deployments.sh
./contracts/script/sync-listener-subscription.sh
./contracts/script/fund-reactive-listener.sh
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
- `create-wallet.sh` 可以在任意时刻为当前 `OWNER_PRIVATE_KEY` 对应的 owner 创建或恢复 autonomous wallet，并把 `.env` / 前端地址同步到这只 wallet
- listener 本身不再把该值写进 callback payload，payload 里使用 `address(0)` 让 Reactive 在真实 callback 时填充 RVM ID
- `sync-listener-subscription.sh` 会直接检查当前 ReactVM 上是否真的订阅了当前 `signalEmitter + topic0`；如果订阅缺失，它会通过 Reactive system contract 补一次 `subscribeContract(...)`
- `fund-reactive-listener.sh` 会给 Reactive listener 补运行资金，并调用 `coverDebt()` 清掉当前 vendor debt；这一步和 destination callback proxy 充值不是一回事

如果要继续往下做，当前更合理的方向是：

1. 把 Reactive runtime / listener debt / operator heartbeat 做成前端更显式的运行时状态
2. 增加真实链路的回归测试和 proof 留存，而不只依赖临场脚本
3. 把单 intent 模型扩展成更像钱包的多 intent / 历史记录体验
4. 继续收敛 operator service，让前端用户完全不用理解 listener/runtime 细节

当前目录里已经有可直接运行的 shell 脚本：

- [deploy-local.sh](/Users/wx/Desktop/WillLead/contracts/script/deploy-local.sh)
- [verify-env.sh](/Users/wx/Desktop/WillLead/contracts/script/verify-env.sh)
- [bootstrap-demo.sh](/Users/wx/Desktop/WillLead/contracts/script/bootstrap-demo.sh)
- [verify-deployments.sh](/Users/wx/Desktop/WillLead/contracts/script/verify-deployments.sh)
- [create-wallet.sh](/Users/wx/Desktop/WillLead/contracts/script/create-wallet.sh)
- [configure-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/configure-intent.sh)
- [ensure-listener-armed.sh](/Users/wx/Desktop/WillLead/contracts/script/ensure-listener-armed.sh)
- [fund-reactive-listener.sh](/Users/wx/Desktop/WillLead/contracts/script/fund-reactive-listener.sh)
- [pause-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/pause-intent.sh)
- [resume-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/resume-intent.sh)
- [emit-signal.sh](/Users/wx/Desktop/WillLead/contracts/script/emit-signal.sh)
- [watch-intent-automation.sh](/Users/wx/Desktop/WillLead/contracts/script/watch-intent-automation.sh)
- [start-operator-service.sh](/Users/wx/Desktop/WillLead/contracts/script/start-operator-service.sh)
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

当前前端故意不再提供“由用户钱包直接发送 source signal”的主按钮。产品口径是：

- 用户只在 setup 阶段为 intent 签名
- 运行期 signal 由外部 operator、脚本或上游协议事件触发
- 钱包在用户离线后继续自动执行

如果你希望前端里保存 intent 后由 operator 侧自动把 shared listener 恢复到可运行状态，可以单独启动：

```bash
./contracts/script/start-operator-service.sh
```

这条 operator service 会监听目标链上的 `IntentConfigured` 事件，并自动执行：

- `fund-reactive-listener.sh` 对应的 funding / `coverDebt()` 逻辑
- `sync-listener-subscription.sh`
- `resume-listener.sh`（当 operator key 拥有 listener 且当前处于 paused）

如果你只是想用最轻量的 shell watcher，也可以继续跑：

```bash
./contracts/script/watch-intent-automation.sh
```

另外，`configure-intent.sh` 现在在脚本路径下也会自动调用一次 `ensure-listener-armed.sh`。

建议在每次正式演示前先跑：

```bash
./contracts/script/demo-readiness.sh
```

这条命令会校验：

- `.env` 和部署地址是否完整
- wallet intent 是否已启用且仍处于 `Active`
- callback reserve 是否高于 wallet 的 `minAutomationBalance`
- reactive listener 自身的运行资金是否高于当前 vendor debt
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

1. 把 operator runtime 状态继续接回前端，显式展示 listener balance / debt / last funding action
2. 给这次测试网闭环补一份稳定的 proof 产物和截图，作为黑客松提交材料
3. 把单 intent MVP 继续包装成更完整的钱包体验，而不是继续停留在脚本层可演示
