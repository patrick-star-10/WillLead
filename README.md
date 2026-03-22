# WillLead

WillLead 是一个按照 [WillLead_Implementation_Guide.pdf](/Users/wx/Desktop/WillLead/WillLead_Implementation_Guide.pdf) 和 [WillLead_Reactive_Native_MVP.md](/Users/wx/Desktop/WillLead/WillLead_Reactive_Native_MVP.md) 搭建的 `reactive-native wallet` MVP。

当前目标不是一次性做完整钱包，而是先把下面这条链路做通：

`SignalEmitter -> ReactiveListener -> callback -> Wallet intent execution -> Frontend state refresh`

## 当前进度

截至 2026-03-21，这个 MVP 已经完成了两层验证：

1. 原始 `emitSignal(...)` 路径的真实闭环
2. 新的 `protocol operator + mirrored intent + permissionless poke()` 路径的真实闭环

当前最新版本已经做到：

- 用户只在 setup 阶段签一次，把 intent 写进 autonomous wallet
- protocol operator 会把 destination wallet 的当前 intent 镜像到 origin `WillLeadSignalEmitter`
- source side 不再需要每次人工重填 `token / recipient / amount`
- keeper 或脚本只需要调用 `poke(wallet, nonce)` 就能触发 source signal
- shared listener 会继续把 signal 路由到 destination callback，wallet 按已保存的 intent 执行

这次最新的 `poke()` 版本验证里，关键交易为：

- intent configured: `0xd2c178ea2a913de8d2753d39cb30064ea28525c26ce9194197d0f2bfe908d1e1`
- origin permissionless poke: `0x6eb2c2db96dba97c5f75c5fcb6c515e5f2a3794c98e1f6c17054b95af2e4d5a9`
- reactive dispatch: `0x615eed2c1948971dbe5bf3f73d42e48bdc943b4c676d4fce8ceda124e7730e5f`
- destination execution: `0x5e01719af3cfad116144118372cc5d6a69e0141ca5ece0a41e7de3b27cf77abe`

当前系统层面的判断是：

- `intent save -> listener armed -> external signal -> destination execution` 这条主链路已经成立
- `protocol operator -> mirrored intent -> permissionless poke()` 这条更接近正式产品的运行路径也已经成立
- controller wallet 和 autonomous wallet 的资产语义已经在前端分开展示
- operator service 已经会自动同步 mirrored intent、补 Reactive listener runtime 资金、清理 debt、恢复订阅并 resume listener
- 当前还没有做到“完全不依赖链下服务”；更准确地说，这是链上执行 + 协议 operator 维护的版本
- 还没做的是真实上游协议事件接入、keeper 网络化和更完整的钱包产品体验，而不是基础自动执行闭环

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
  在源链保存由 protocol operator 镜像过来的 intent，并提供 permissionless `poke()` 来发出 `StrategySignal`
- `WillLeadReactiveListener`
  基于官方 `reactive-lib` 订阅源链事件，并生成目标链 callback payload

说明：

- `WillLeadReactiveListener` 现在已经切到本地 vendor 的官方 `reactive-lib` 最小依赖和 `AbstractPausableReactive` 抽象类
- callback payload 的第一个 `address` 参数按官方模式保留为 `address(0)` 占位，实际回调时由 Reactive 基础设施覆写成 RVM ID
- `automation credit` 的产品语义已经进入前端和钱包配置，但实际 callback 资金准备仍然要通过官方 `depositTo(wallet)` 路径完成
- `WillLeadSignalEmitter` 现在不再只是一只 demo event emitter；operator 会把 destination wallet 的当前 intent 镜像到 origin emitter，之后任意 keeper 都可以通过 `poke(wallet, nonce)` 触发 source signal，而不需要用户再次签名

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
- `ORIGIN_CHAIN_ID / DESTINATION_CHAIN_ID / REACTIVE_CHAIN_ID` 不再要求固定是当前这套 Sepolia 组合；前端和 operator 现在按 chain id 解析链元数据
- 当前内置链注册表包含 `Ethereum Sepolia / Base Sepolia / Arbitrum Sepolia / OP Sepolia / Polygon Amoy / Reactive Lasna`
- 如果你要接入新的 Reactive-supported source chain，可以直接改 env 里的 chain id + RPC；若前端注册表里还没有这条链，再补 `*_CHAIN_NAME` 和 explorer，或把它加入 [frontend/src/lib/chainRegistry.json](/Users/wx/Desktop/WillLead/frontend/src/lib/chainRegistry.json)
- `deploy-local.sh` 现在会部署共享的 `WillLeadWalletFactory`，然后为当前 `OWNER_PRIVATE_KEY` 对应的 owner 自动创建第一只 wallet
- `create-wallet.sh` 可以在任意时刻为当前 `OWNER_PRIVATE_KEY` 对应的 owner 创建或恢复 autonomous wallet，并把 `.env` / 前端地址同步到这只 wallet
- listener 本身不再把该值写进 callback payload，payload 里使用 `address(0)` 让 Reactive 在真实 callback 时填充 RVM ID
- `sync-listener-subscription.sh` 会直接检查当前 ReactVM 上是否真的订阅了当前 `signalEmitter + topic0`；如果订阅缺失，它会通过 Reactive system contract 补一次 `subscribeContract(...)`
- `fund-reactive-listener.sh` 会给 Reactive listener 补运行资金，并调用 `coverDebt()` 清掉当前 vendor debt；这一步和 destination callback proxy 充值不是一回事

如果要继续往下做，当前更合理的方向是：

1. 把 protocol operator 从“本机脚本”升级成长期在线的部署方服务
2. 用真实上游协议事件替代测试网里的 `poke()` 复现入口
3. 增加真实链路的回归测试和 proof 留存，而不只依赖临场脚本
4. 把单 intent 模型扩展成更像钱包的多 intent / 历史记录体验

当前目录里已经有可直接运行的 shell 脚本：

- [deploy-local.sh](/Users/wx/Desktop/WillLead/contracts/script/deploy-local.sh)
- [verify-env.sh](/Users/wx/Desktop/WillLead/contracts/script/verify-env.sh)
- [bootstrap-demo.sh](/Users/wx/Desktop/WillLead/contracts/script/bootstrap-demo.sh)
- [verify-deployments.sh](/Users/wx/Desktop/WillLead/contracts/script/verify-deployments.sh)
- [create-wallet.sh](/Users/wx/Desktop/WillLead/contracts/script/create-wallet.sh)
- [configure-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/configure-intent.sh)
- [configure-runtime-route.sh](/Users/wx/Desktop/WillLead/contracts/script/configure-runtime-route.sh)
- [ensure-listener-armed.sh](/Users/wx/Desktop/WillLead/contracts/script/ensure-listener-armed.sh)
- [fund-reactive-listener.sh](/Users/wx/Desktop/WillLead/contracts/script/fund-reactive-listener.sh)
- [pause-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/pause-intent.sh)
- [resume-intent.sh](/Users/wx/Desktop/WillLead/contracts/script/resume-intent.sh)
- [emit-signal.sh](/Users/wx/Desktop/WillLead/contracts/script/emit-signal.sh)
- [poke-signal.sh](/Users/wx/Desktop/WillLead/contracts/script/poke-signal.sh)
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

- `syncIntent(...)`，把 destination wallet 的当前 intent 镜像到 origin `WillLeadSignalEmitter`
- `fund-reactive-listener.sh` 对应的 funding / `coverDebt()` 逻辑
- `sync-listener-subscription.sh`
- `resume-listener.sh`（当 operator key 拥有 listener 且当前处于 paused）

链配置说明：

- 前端当前会优先读 `VITE_*_CHAIN_ID / VITE_*_RPC_URL / VITE_*_EXPLORER_BASE_URL`
- 运行 `./contracts/script/sync-frontend-env.sh` 后，`.env` 里的 `ORIGIN_* / DESTINATION_* / REACTIVE_*` 会同步到 `frontend/.env.local`
- 浏览器钱包切到未预置链时，前端现在会尝试自动 `wallet_addEthereumChain`

同时，这条 service 现在还会持续轮询 wallet runtime：

- 当 intent 变成 `Paused / Exhausted / Inactive` 时，把 mirrored intent 标成 inactive
- 当 intent 重新变成 `Active` 时，自动恢复 mirrored intent、listener funding 和 armed 状态

如果你想在测试网里复现“非用户签名的外部触发”，优先用：

```bash
./contracts/script/poke-signal.sh <wallet> <executionNonce>
```

这条命令调用的是 origin emitter 上的 permissionless `poke()`。  
`emit-signal.sh` 仍然保留，主要用于低层 raw event 调试。

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
