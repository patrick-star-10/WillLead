# WillLead Hackathon Gap Checklist

更新时间：2026-03-23

这份清单用于把当前仓库里“已经跑通的 MVP 能力”和“方案里还没真正实现的部分”拆开，方便继续推进黑客松提交材料、demo 叙事和后续开发。

## 1. 当前已经成立的基线

下面这些能力已经可以视为当前项目的已实现基线：

- 单 intent autonomous wallet 已成立
- `SignalEmitter -> ReactiveListener -> callback -> Wallet execution` 主链路已成立
- `mirrored intent + permissionless poke()` 路径已成立
- `Sepolia Execution` / `Lasna Execution` 双 execution environment 已成立
- controller wallet / autonomous wallet 资产语义已分离
- automation credit 已可展示并支持 top-up
- operator service 已能自动做 mirrored intent sync、listener funding、cover debt、subscription repair、resume listener
- 本地 demo 脚本、readiness 检查、proof 收集、runbook 已具备

## 2. 必补缺口

这部分是最值得优先补的。它们直接影响黑客松提交质量、评委理解成本和项目完成度。

### P0. 提交材料级 proof 固化

状态：部分实现

当前已有：

- `collect-proof.sh` 可收集关键链上证据
- `Demo_Runbook.md` 已有演示话术
- 前端有 `Proof Panel`

当前缺口：

- 缺少固定截图、固定 proof 样例、固定 tx 列表
- 缺少适合提交页面直接引用的稳定材料包
- 缺少“哪次验证最适合对外展示”的统一版本标记

建议动作：

- 固定一组主演示地址和交易哈希
- 输出一份面向评委的英文 proof summary
- 整理一套截图：setup、automation、activity、proof

### P0. 前端未完整展示 Reactive callback 证据

状态：已推进

当前脚本和文档都把三段证据定义为：

- `Origin Signal`
- `Reactive Callback` / `Reactive Dispatch`
- `Destination Execution`

此前前端 `Activity / Proof Panel` 只聚合了：

- wallet runtime binding
- origin signal
- destination execution
- destination skipped

当前已补：

- 前端 proof 聚合已接入 reactive 链 `Callback` 事件
- `Activity` 现在可以显示 `Reactive Callback`
- 已尝试从 callback payload 解码 `executionNonce`，用于和前后两段证据串联

剩余尾项：

- 继续确认 `Reactive Callback` 与脚本里的 `Reactive Dispatch` 命名是否完全统一
- 继续检查共享 emitter 场景下 `Origin Signal` 是否需要更严格按当前钱包过滤
- 用一组真实历史数据确认三段证据在前端时间线里的展示效果

涉及代码：

- `frontend/src/lib/willlead.ts`
- `frontend/src/components/ProofPanel.tsx`
- `contracts/script/collect-proof.sh`

建议动作：

- 保持前端与 `collect-proof.sh`、runbook 的证据口径一致
- 用固定 demo 交易验证 `Origin Signal -> Reactive Callback -> Destination Execution` 的完整展示

### P1. 真实上游协议事件接入

状态：未实现

当前 source trigger 仍主要依赖：

- operator relay
- shell 脚本
- permissionless `poke()`

这对 MVP 足够，但还不是真正的“协议事件驱动钱包”。

建议动作：

- 选一个真实协议事件作为 source event
- 替换 demo `poke()` 作为主要演示路径
- 在文档中明确 source protocol、触发条件、信号映射规则

### P1. Operator / keeper 长期在线化

状态：未实现

当前 operator 本质上还是本机脚本服务，不是正式部署版本。

当前缺口：

- 没有长期在线部署形态
- 没有更明确的故障恢复与告警
- 没有 keeper 网络化叙事

建议动作：

- 把当前 operator 脚本收敛成稳定服务入口
- 输出最小部署说明
- 明确 runtime file、heartbeat、wallet targeting 的服务职责

## 3. 产品化缺口

这部分不会阻止你做 demo，但会影响“这是一个钱包而不是一次性自动化 demo”的说服力。

### P1. 失败状态和恢复策略不够完整

状态：部分实现

当前已有：

- paused
- exhausted
- duplicate signal 防护
- skipped event

当前缺口：

- callback 失败原因分类不完整
- credit 不足 / 资产不足 / intent mismatch 的前端状态表达不完整
- retry / recover 策略不系统

### P1. Automation credit 还不是完整钱包能力

状态：部分实现

当前已有：

- reserve / debt 净额展示
- minimum automation balance 展示
- top-up automation credit

当前缺口：

- credit 来源与用途说明
- credit 耗尽后的完整状态表达
- top-up 历史
- 最近一次 funding 记录的用户级视图

### P2. Subscription 管理还不是钱包一等能力

状态：部分实现

当前已有：

- listener address
- signal emitter
- source chain / destination chain / topic0
- armed / missing 状态

当前缺口：

- “为什么这个钱包会响应该 signal”的产品化解释
- 更明确的 subscription 开关与责任边界
- 钱包视角的订阅来源说明

### P2. Activity 仍偏 proof panel，不是完整钱包历史

状态：未实现

当前缺口：

- user action history
- funding history
- failed execution history
- 更完整的 execution timeline

## 4. 钱包能力缺口

这部分是赛后继续做最合理，但如果补一小部分，也会明显提升项目完成度。

### P2. Portfolio 视图不完整

状态：部分实现

当前已有：

- native asset 展示
- 当前 intent token 展示
- 手动 watched ERC20

当前缺口：

- token 自动发现
- 更完整 metadata
- 更像钱包的 portfolio 汇总视图

### P3. 多 intent 未实现

状态：未实现

当前 wallet 还是单 intent 模型。

后续方向：

- 多 intent
- priority
- filter
- template 化

### P3. Web wallet 体验仍是 MVP

状态：部分实现

当前已有：

- create/import web wallet

当前缺口：

- 助记词确认流程
- 备份提醒
- 多账户或多钱包切换
- 更明确的 session / persistent wallet 管理

## 5. 推荐推进顺序

如果目标是优先提升黑客松提交质量，建议按下面顺序推进：

1. 补前端 `Reactive Callback` 证据展示，让前端与脚本/runbook 口径一致
2. 固定一套 proof、截图、tx hash、演示地址，整理成提交材料
3. 补失败状态说明和 automation credit 的文案与可见状态
4. 把 operator 从“本机脚本”整理成更像部署服务的形态
5. 有余力再接一个真实上游协议事件

## 6. 当前最值得立刻动手的三项

- 把 `Reactive Callback` 接入前端 Activity
- 整理英文版 hackathon proof summary
- 整理固定截图和主演示 runbook
