import { create } from 'zustand'

export type Locale = 'en' | 'zh-CN'

const localeStorageKey = 'willlead.locale'

const messages = {
  en: {
    localeEnglish: 'EN',
    localeChinese: '简体中文',
    heroEyebrow: 'Reactive-native Wallet MVP',
    heroCopy:
      'A wallet that treats event-driven execution as a default capability, not an add-on bot.',
    connectWallet: 'Connect Wallet',
    disconnectWallet: 'Disconnect Wallet',
    connectHint: 'Connect first, then configure the transfer plan.',
    connectedHint: 'connected. Click above to disconnect this session.',
    walletAccessUnavailable: 'Wallet binding is unavailable until chain state can be read.',
    connectWalletToLoadRuntime: 'Connect the controlling wallet to load listener state and execution history.',
    initializeWalletToContinue: 'No autonomous wallet exists for this address yet. Initialize one to continue.',
    connectedWalletMismatch:
      'Connected wallet does not control the configured autonomous wallet, so no listener state is shown.',
    walletView: 'Wallet View',
    overviewTab: 'Overview',
    overviewDesc: 'Balance, identity, execution runway, and automation credit.',
    planTab: 'Transfer Plan',
    planDesc: 'Configure the onchain transfer this wallet should keep executing.',
    automationTab: 'Automation',
    automationDesc: 'Operate the reactive listener and simulate the source trigger.',
    activityTab: 'Activity',
    activityDesc: 'Review recent origin signals, callbacks, executions, and skipped runs.',
    walletOverviewTitle: 'Wallet Overview',
    transferPlanTitle: 'Transfer Plan',
    automationTitle: 'Automation Engine',
    activityTitle: 'Activity Ledger',
    walletOverviewKicker: 'Wallet Overview',
    controllerWalletBalance: 'Controller wallet balance',
    controller: 'Controller',
    signingSource: 'Signing source',
    autonomousWalletBalance: 'Autonomous wallet contract balance',
    autonomousWallet: 'Autonomous wallet',
    executionMode: 'Execution mode',
    reactiveCallback: 'Reactive callback',
    controllerWalletAssets: 'Controller wallet assets',
    controllerAssetsEmpty: 'Connect a Sepolia wallet to load controller assets.',
    autonomousWalletAssets: 'Autonomous wallet assets',
    autonomousAssetsEmpty:
      'Connect the wallet that owns this autonomous wallet to load its balance and assets.',
    fundAutonomousWallet: 'Fund Autonomous Wallet',
    fundingAutonomousWalletShort: 'Funding...',
    autonomousWalletFundingNote:
      'Send native execution funds into the autonomous wallet itself. This is separate from automation credit.',
    connection: 'Connection',
    walletConnected: 'Wallet connected',
    connectWalletShort: 'Connect wallet',
    executionRunway: 'Execution runway',
    remainingLeft: 'left',
    usedCount: 'used',
    runtimeStatus: 'Runtime status',
    lastSync: 'Last sync',
    latestChainSnapshot: 'Latest chain snapshot',
    automationKicker: 'Automation Credit',
    automationNote:
      'This wallet keeps a separate execution balance so Reactive callbacks can still land after the frontend goes offline.',
    listenerPaused: 'Listener Paused',
    listenerArmed: 'Listener Armed',
    availableAutomationCredit: 'Available automation credit',
    health: 'Health',
    requiredFloor: 'Required floor',
    listenerStatus: 'Listener status',
    subscriptionStatus: 'Subscription',
    listenerNotListening: 'Not listening yet',
    active: 'Active',
    paused: 'Paused',
    inactive: 'Inactive',
    exhausted: 'Exhausted',
    subscriptionArmed: 'Armed',
    subscriptionMissing: 'Missing',
    readyForCallback: 'Ready to receive Reactive callbacks',
    subscriptionReady: 'Reactive system is subscribed to the current source emitter.',
    subscriptionRepairNeeded: 'Reactive system is not subscribed to the current source emitter yet.',
    callbackGasLimit: 'Callback gas limit',
    callbackBudget: 'Current execution budget per callback',
    signalSource: 'Signal source',
    listenerContract: 'Listener contract',
    originChainRoute: 'Origin chain',
    destinationChainRoute: 'Destination chain',
    signalTopic: 'Signal topic',
    listenerRoutingKicker: 'Listener Routing',
    listenerRoutingNote:
      'This wallet runtime listens to one source emitter and only reacts when the matching subscription is armed.',
    refreshCredit: 'Refresh Credit',
    refreshing: 'Refreshing...',
    topUpAutomation: 'Top Up Automation',
    transferPlanKicker: 'Transfer Plan',
    transferPlanNote: 'Define the transfer this wallet should keep executing.',
    initializeAutonomousWallet: 'Initialize Autonomous Wallet',
    initializingAutonomousWallet: 'Initializing wallet...',
    initializeAutonomousWalletNote:
      'Deploy a dedicated autonomous wallet for this owner before configuring the first intent.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    token: 'Token',
    recipient: 'Recipient',
    amountPerExecution: 'Amount / Execution',
    maxExecutions: 'Max Executions',
    remaining: 'Remaining',
    minAutomationBalance: 'Min Automation Balance',
    saving: 'Saving...',
    saveTransferPlan: 'Save Transfer Plan',
    pausePlan: 'Pause Plan',
    resumePlan: 'Resume Plan',
    automationEngineKicker: 'Automation Engine',
    automationEngineNote: 'Monitor the relay path that turns source signals into transfers.',
    lastExecutionNonce: 'Last Execution Nonce',
    lastExecutedAt: 'Last Executed At',
    lastSignalHash: 'Last Signal Hash',
    balanceDelta: 'Balance Delta',
    emitSourceSignal: 'Emit Source Signal',
    triggering: 'Triggering...',
    pauseListener: 'Pause Listener',
    resumeListener: 'Resume Listener',
    activityKicker: 'Activity Ledger',
    activityNote:
      'A rolling execution history that shows what the wallet observed, executed, or skipped while you were away.',
    chainEvidence: 'Chain Evidence',
    activityEmpty: 'No execution history yet for this wallet.',
    observedStatus: 'Observed',
    successStatus: 'Executed',
    skippedStatus: 'Skipped',
    observedAt: 'Observed at',
    executionNonceLabel: 'Execution nonce',
    skipReason: 'Skip reason',
    listenerManagedByOperator: 'This shared listener is managed by the deployment operator.',
    walletAccess: 'Wallet Access',
    chooseSigningMethod: 'Choose how this app should sign transactions',
    currentSigner: 'Current signer',
    close: 'Close',
    option1: 'Option 1',
    option2: 'Option 2',
    connectOtherWallet: 'Connect other wallet',
    connectOtherWalletNote:
      'Use the injected browser wallet flow you already had, such as MetaMask or Rabby.',
    createWallet: 'Create wallet',
    createWalletNote:
      'Generate or import a mnemonic and let this app act as an independent web wallet.',
    back: 'Back',
    chooseBrowserWallet: 'Choose browser wallet',
    chooseBrowserWalletNote:
      'Each click explicitly chooses which injected wallet to connect.',
    noInjectedWallet: 'No injected wallet detected in this browser.',
    connect: 'Connect',
    generateMnemonic: 'Generate mnemonic',
    generating: 'Generating...',
    generatedWalletNote: 'A generated wallet is saved locally in this browser for this MVP.',
    recoveryPhrase: 'Recovery phrase',
    recoveryPhraseNote: 'Write these 12 words down before closing this dialog.',
    importMnemonic: 'Import an existing mnemonic',
    importMnemonicPlaceholder: 'paste your 12 or 24 word recovery phrase',
    importWebWallet: 'Import web wallet',
    importing: 'Importing...',
    noWalletConnected: 'No wallet connected',
    browserWallet: 'Browser Wallet',
    webWallet: 'Web Wallet',
    notConnected: 'Not connected',
    healthy: 'Healthy',
    low: 'Low',
    unknown: 'Unknown',
    unavailable: 'Unavailable',
    never: 'Never',
    notConfigured: 'Not configured',
    origin: 'Origin',
    reactive: 'Reactive',
    destination: 'Destination',
    originSignal: 'Origin Signal',
    reactiveCallbackLabel: 'Reactive Dispatch',
    destinationExecution: 'Destination Execution',
    destinationSkipped: 'Destination Skipped',
    originSignalDesc: 'Signal emitted on the source chain.',
    reactiveCallbackDesc: 'Reactive system accepted the listener job and dispatched the destination callback.',
    destinationExecutionDesc: 'Autonomous wallet executed the transfer on the destination chain.',
    destinationSkippedDesc: 'Autonomous wallet skipped execution and recorded the reason.',
    readyBindWallet: 'Ready to bind a wallet and configure the first intent.',
    preparingWalletSession: 'Preparing wallet session...',
    restoredWebWallet: 'Restored web wallet',
    readyToConnectWallet: 'Ready to connect a browser wallet or create a web wallet.',
    initializeWalletFailed: 'Wallet session initialization failed.',
    failedInitializeWallet: 'Failed to initialize wallet',
    connectingBrowserWallet: 'Connecting browser wallet...',
    connectedWalletPrefix: 'Connected',
    browserWalletLower: 'browser wallet',
    browserWalletConnectionFailed: 'Browser wallet connection failed.',
    failedConnectBrowserWallet: 'Failed to connect browser wallet',
    creatingWebWallet: 'Creating web wallet...',
    createdWebWallet: 'Created web wallet',
    webWalletCreationFailed: 'Web wallet creation failed.',
    failedCreateWebWallet: 'Failed to create web wallet',
    importingWebWalletStatus: 'Importing web wallet...',
    importedWebWallet: 'Imported web wallet',
    webWalletImportFailed: 'Web wallet import failed.',
    failedImportWebWallet: 'Failed to import web wallet',
    disconnectingWalletSession: 'Disconnecting wallet session...',
    walletDisconnected: 'Wallet disconnected.',
    walletDisconnectFailed: 'Wallet disconnect failed.',
    failedDisconnectWallet: 'Failed to disconnect wallet',
    refreshingWalletState: 'Refreshing wallet state...',
    walletStateRefreshed: 'Wallet state refreshed.',
    refreshFailed: 'Refresh failed.',
    failedRefreshChainState: 'Failed to refresh chain state',
    submittingIntentTransaction: 'Submitting intent transaction...',
    intentConfigurationFailed: 'Intent configuration failed.',
    failedConfigureIntent: 'Failed to configure intent',
    fundingAutomationCredit: 'Funding automation credit...',
    automationFundingFailed: 'Automation funding failed.',
    failedFundAutomation: 'Failed to fund automation credit',
    fundingAutonomousWallet: 'Funding autonomous wallet...',
    autonomousWalletFundingFailed: 'Autonomous wallet funding failed.',
    failedFundAutonomousWallet: 'Failed to fund autonomous wallet',
    pausingIntent: 'Pausing intent...',
    pauseFailed: 'Pause failed.',
    failedPauseIntent: 'Failed to pause intent',
    resumingIntent: 'Resuming intent...',
    resumeFailed: 'Resume failed.',
    failedResumeIntent: 'Failed to resume intent',
    pausingReactiveListener: 'Pausing reactive listener...',
    reactiveListenerPauseFailed: 'Reactive listener pause failed.',
    failedPauseReactiveListener: 'Failed to pause reactive listener',
    resumingReactiveListener: 'Resuming reactive listener...',
    reactiveListenerResumeFailed: 'Reactive listener resume failed.',
    failedResumeReactiveListener: 'Failed to resume reactive listener',
    emittingSourceSignal: 'Emitting source signal...',
    signalEmissionFailed: 'Signal emission failed.',
    failedEmitSourceSignal: 'Failed to emit source signal',
    intentConfiguredAction: 'Intent Configured',
    intentConfiguredDesc: 'Configured the wallet intent on the destination chain.',
    intentPausedAction: 'Intent Paused',
    intentPausedDesc: 'Paused reactive execution on the destination wallet.',
    intentResumedAction: 'Intent Resumed',
    intentResumedDesc: 'Reactivated reactive execution on the destination wallet.',
    sourceSignalEmittedAction: 'Source Signal Emitted',
    sourceSignalEmittedDesc: 'Emitted StrategySignal on the origin chain.',
    automationCreditToppedUpAction: 'Automation Credit Topped Up',
    automationCreditToppedUpDesc:
      'Deposited funds into the callback proxy for wallet automation.',
    autonomousWalletFundedAction: 'Autonomous Wallet Funded',
    autonomousWalletFundedDesc: 'Transferred native execution funds into the autonomous wallet.',
    reactiveListenerPausedAction: 'Reactive Listener Paused',
    reactiveListenerPausedDesc: 'Paused the reactive listener subscription set.',
    reactiveListenerResumedAction: 'Reactive Listener Resumed',
    reactiveListenerResumedDesc: 'Resumed the reactive listener subscription set.',
    autonomousWalletCreatedAction: 'Autonomous Wallet Ready',
    autonomousWalletCreatedDesc: 'Created or recovered the autonomous wallet bound to this owner.',
    walletAddressMissing: 'VITE_WALLET_ADDRESS is not configured',
    walletFactoryMissing: 'VITE_WALLET_FACTORY_ADDRESS is not configured',
    walletNotInitialized: 'No autonomous wallet is registered for the connected owner yet.',
    signalEmitterOrWalletMissing: 'VITE_SIGNAL_EMITTER_ADDRESS or VITE_WALLET_ADDRESS is not configured',
    callbackProxyOrWalletMissing: 'VITE_CALLBACK_PROXY or VITE_WALLET_ADDRESS is not configured',
    reactiveListenerMissing: 'VITE_REACTIVE_LISTENER_ADDRESS is not configured'
  },
  'zh-CN': {
    localeEnglish: 'EN',
    localeChinese: '简体中文',
    heroEyebrow: 'Reactive 原生钱包 MVP',
    heroCopy: '让事件驱动执行成为默认能力，而不是额外挂脚本的钱包。',
    connectWallet: '连接钱包',
    disconnectWallet: '断开钱包',
    connectHint: '先连接钱包，再配置转账计划。',
    connectedHint: '已连接。点击上方可断开这次会话。',
    walletAccessUnavailable: '链上状态不可读之前，暂时无法确认钱包归属。',
    connectWalletToLoadRuntime: '先连接控制这个自主钱包的地址，才能读取监听状态和执行历史。',
    initializeWalletToContinue: '当前地址还没有对应的自主钱包，需要先初始化后才能继续。',
    connectedWalletMismatch: '当前连接的钱包并不控制这只自主钱包，因此不会展示它的监听和执行状态。',
    walletView: '钱包视图',
    overviewTab: '总览',
    overviewDesc: '查看资产、身份、执行次数和自动执行额度。',
    planTab: '转账计划',
    planDesc: '配置这个钱包要持续执行的链上转账规则。',
    automationTab: '自动执行',
    automationDesc: '管理监听器，并模拟源链触发。',
    activityTab: '链上记录',
    activityDesc: '查看最近的源链信号、回调、成功执行和跳过记录。',
    walletOverviewTitle: '钱包总览',
    transferPlanTitle: '转账计划',
    automationTitle: '自动执行引擎',
    activityTitle: '链上记录',
    walletOverviewKicker: '钱包总览',
    controllerWalletBalance: '控制钱包余额',
    controller: '控制钱包',
    signingSource: '签名来源',
    autonomousWalletBalance: '自主执行钱包合约余额',
    autonomousWallet: '自主执行钱包',
    executionMode: '执行方式',
    reactiveCallback: 'Reactive 回调',
    controllerWalletAssets: '控制钱包资产',
    controllerAssetsEmpty: '连接 Sepolia 钱包后，这里会显示控制钱包资产。',
    autonomousWalletAssets: '自主执行钱包资产',
    autonomousAssetsEmpty: '连接拥有这只自主钱包的地址后，这里才会显示它的余额和资产。',
    fundAutonomousWallet: '补充钱包执行资金',
    fundingAutonomousWalletShort: '充值中...',
    autonomousWalletFundingNote:
      '这里补的是 autonomous wallet 自己的原生执行资产，不是 automation credit。',
    connection: '连接状态',
    walletConnected: '钱包已连接',
    connectWalletShort: '连接钱包',
    executionRunway: '剩余执行次数',
    remainingLeft: '次可执行',
    usedCount: '已执行',
    runtimeStatus: '运行状态',
    lastSync: '最近同步',
    latestChainSnapshot: '最近一次链上快照',
    automationKicker: '自动执行额度',
    automationNote:
      '这个钱包会单独保留一份自动执行额度，这样即使前端离线，Reactive 回调也能继续落地。',
    listenerPaused: '监听已暂停',
    listenerArmed: '监听已启用',
    availableAutomationCredit: '可用自动执行额度',
    health: '额度状态',
    requiredFloor: '最低保留额度',
    listenerStatus: '监听状态',
    subscriptionStatus: '订阅状态',
    listenerNotListening: '暂未监听',
    active: '运行中',
    paused: '已暂停',
    inactive: '未启用',
    exhausted: '已耗尽',
    subscriptionArmed: '已就绪',
    subscriptionMissing: '缺失',
    readyForCallback: '已准备好接收 Reactive 回调',
    subscriptionReady: 'Reactive system 已订阅当前的源事件合约。',
    subscriptionRepairNeeded: 'Reactive system 还没有订阅当前的源事件合约。',
    callbackGasLimit: '回调 Gas 上限',
    callbackBudget: '每次回调可用的执行预算',
    signalSource: '事件来源',
    listenerContract: '监听合约',
    originChainRoute: '源链',
    destinationChainRoute: '目标链',
    signalTopic: '监听 Topic',
    listenerRoutingKicker: '监听路由',
    listenerRoutingNote: '这个钱包运行时只监听一类源事件，只有订阅真正 armed 后才会继续驱动目标链执行。',
    refreshCredit: '刷新额度',
    refreshing: '刷新中...',
    topUpAutomation: '补充自动执行额度',
    transferPlanKicker: '转账计划',
    transferPlanNote: '定义这个钱包需要持续执行的转账规则。',
    initializeAutonomousWallet: '初始化自主钱包',
    initializingAutonomousWallet: '正在初始化钱包...',
    initializeAutonomousWalletNote: '先为当前 owner 部署一只自主钱包，再配置第一条 intent。',
    enabled: '已启用',
    disabled: '未启用',
    token: '代币',
    recipient: '收款地址',
    amountPerExecution: '每次执行金额',
    maxExecutions: '最大执行次数',
    remaining: '剩余次数',
    minAutomationBalance: '自动执行最低额度',
    saving: '保存中...',
    saveTransferPlan: '保存转账计划',
    pausePlan: '暂停计划',
    resumePlan: '恢复计划',
    automationEngineKicker: '自动执行引擎',
    automationEngineNote: '查看从源链信号到目标转账的整条执行链路。',
    lastExecutionNonce: '最近执行序号',
    lastExecutedAt: '最近执行时间',
    lastSignalHash: '最近信号哈希',
    balanceDelta: '余额变化',
    emitSourceSignal: '发送源链信号',
    triggering: '触发中...',
    pauseListener: '暂停监听',
    resumeListener: '恢复监听',
    activityKicker: '链上记录',
    activityNote: '这里会持续展示钱包离线期间观察到、完成或跳过的执行历史。',
    chainEvidence: '链上证据',
    activityEmpty: '这只钱包目前还没有执行历史。',
    observedStatus: '已观察',
    successStatus: '已执行',
    skippedStatus: '已跳过',
    observedAt: '记录时间',
    executionNonceLabel: '执行序号',
    skipReason: '跳过原因',
    listenerManagedByOperator: '这只共享 listener 由部署运营方管理。',
    walletAccess: '钱包接入',
    chooseSigningMethod: '选择这个应用如何发起链上签名',
    currentSigner: '当前签名钱包',
    close: '关闭',
    option1: '方式一',
    option2: '方式二',
    connectOtherWallet: '连接其他钱包',
    connectOtherWalletNote: '使用浏览器钱包插件，例如 MetaMask 或 Rabby。',
    createWallet: '创建钱包',
    createWalletNote: '生成或导入助记词，让这个应用作为独立网页钱包运行。',
    back: '返回',
    chooseBrowserWallet: '选择浏览器钱包',
    chooseBrowserWalletNote: '每次都需要明确选择要连接的钱包插件。',
    noInjectedWallet: '当前浏览器没有检测到可用的钱包插件。',
    connect: '连接',
    generateMnemonic: '生成助记词',
    generating: '生成中...',
    generatedWalletNote: '为了这版 MVP，生成的钱包会保存在当前浏览器本地。',
    recoveryPhrase: '助记词',
    recoveryPhraseNote: '关闭前请先妥善保存这 12 个助记词。',
    importMnemonic: '导入已有助记词',
    importMnemonicPlaceholder: '粘贴 12 或 24 个单词的助记词',
    importWebWallet: '导入网页钱包',
    importing: '导入中...',
    noWalletConnected: '当前未连接钱包',
    browserWallet: '浏览器钱包',
    webWallet: '网页钱包',
    notConnected: '未连接',
    healthy: '充足',
    low: '偏低',
    unknown: '待确认',
    unavailable: '不可用',
    never: '暂无',
    notConfigured: '未配置',
    origin: '源链',
    reactive: 'Reactive',
    destination: '目标链',
    originSignal: '源链信号',
    reactiveCallbackLabel: 'Reactive 派发',
    destinationExecution: '目标链执行',
    destinationSkipped: '目标链跳过',
    originSignalDesc: '信号已在源链发出。',
    reactiveCallbackDesc: 'Reactive system 已接收这次监听任务，并向目标链发起回调派发。',
    destinationExecutionDesc: '自主执行钱包已在目标链完成转账。',
    destinationSkippedDesc: '自主执行钱包已跳过这次执行，并记录了原因。',
    readyBindWallet: '准备好连接钱包并配置第一条转账计划。',
    preparingWalletSession: '正在准备钱包会话...',
    restoredWebWallet: '已恢复网页钱包',
    readyToConnectWallet: '可以连接浏览器钱包，或直接创建网页钱包。',
    initializeWalletFailed: '钱包会话初始化失败。',
    failedInitializeWallet: '初始化钱包失败',
    connectingBrowserWallet: '正在连接浏览器钱包...',
    connectedWalletPrefix: '已连接',
    browserWalletLower: '浏览器钱包',
    browserWalletConnectionFailed: '浏览器钱包连接失败。',
    failedConnectBrowserWallet: '连接浏览器钱包失败',
    creatingWebWallet: '正在创建网页钱包...',
    createdWebWallet: '已创建网页钱包',
    webWalletCreationFailed: '网页钱包创建失败。',
    failedCreateWebWallet: '创建网页钱包失败',
    importingWebWalletStatus: '正在导入网页钱包...',
    importedWebWallet: '已导入网页钱包',
    webWalletImportFailed: '网页钱包导入失败。',
    failedImportWebWallet: '导入网页钱包失败',
    disconnectingWalletSession: '正在断开钱包会话...',
    walletDisconnected: '钱包已断开。',
    walletDisconnectFailed: '断开钱包失败。',
    failedDisconnectWallet: '断开钱包失败',
    refreshingWalletState: '正在刷新钱包状态...',
    walletStateRefreshed: '钱包状态已刷新。',
    refreshFailed: '刷新失败。',
    failedRefreshChainState: '刷新链上状态失败',
    submittingIntentTransaction: '正在提交转账计划交易...',
    intentConfigurationFailed: '转账计划配置失败。',
    failedConfigureIntent: '配置转账计划失败',
    fundingAutomationCredit: '正在补充自动执行额度...',
    automationFundingFailed: '自动执行额度补充失败。',
    failedFundAutomation: '补充自动执行额度失败',
    fundingAutonomousWallet: '正在补充自主钱包执行资金...',
    autonomousWalletFundingFailed: '自主钱包执行资金补充失败。',
    failedFundAutonomousWallet: '补充自主钱包执行资金失败',
    pausingIntent: '正在暂停计划...',
    pauseFailed: '暂停失败。',
    failedPauseIntent: '暂停计划失败',
    resumingIntent: '正在恢复计划...',
    resumeFailed: '恢复失败。',
    failedResumeIntent: '恢复计划失败',
    pausingReactiveListener: '正在暂停 Reactive 监听...',
    reactiveListenerPauseFailed: 'Reactive 监听暂停失败。',
    failedPauseReactiveListener: '暂停 Reactive 监听失败',
    resumingReactiveListener: '正在恢复 Reactive 监听...',
    reactiveListenerResumeFailed: 'Reactive 监听恢复失败。',
    failedResumeReactiveListener: '恢复 Reactive 监听失败',
    emittingSourceSignal: '正在发送源链信号...',
    signalEmissionFailed: '源链信号发送失败。',
    failedEmitSourceSignal: '发送源链信号失败',
    intentConfiguredAction: '转账计划已配置',
    intentConfiguredDesc: '已经在目标链上配置转账计划。',
    intentPausedAction: '转账计划已暂停',
    intentPausedDesc: '目标链钱包的自动执行已暂停。',
    intentResumedAction: '转账计划已恢复',
    intentResumedDesc: '目标链钱包的自动执行已重新启用。',
    sourceSignalEmittedAction: '源链信号已发出',
    sourceSignalEmittedDesc: '已在源链上发出 StrategySignal。',
    automationCreditToppedUpAction: '自动执行额度已补充',
    automationCreditToppedUpDesc: '已经向 callback proxy 存入自动执行所需资金。',
    autonomousWalletFundedAction: '自主钱包执行资金已补充',
    autonomousWalletFundedDesc: '已经向自主钱包转入原生执行资产。',
    reactiveListenerPausedAction: 'Reactive 监听已暂停',
    reactiveListenerPausedDesc: 'Reactive 监听订阅集已暂停。',
    reactiveListenerResumedAction: 'Reactive 监听已恢复',
    reactiveListenerResumedDesc: 'Reactive 监听订阅集已恢复。',
    autonomousWalletCreatedAction: '自主钱包已就绪',
    autonomousWalletCreatedDesc: '已经为当前 owner 创建或恢复对应的自主钱包。',
    walletAddressMissing: '还没有配置 VITE_WALLET_ADDRESS',
    walletFactoryMissing: '还没有配置 VITE_WALLET_FACTORY_ADDRESS',
    walletNotInitialized: '当前连接的 owner 还没有注册自主钱包。',
    signalEmitterOrWalletMissing: '还没有配置 VITE_SIGNAL_EMITTER_ADDRESS 或 VITE_WALLET_ADDRESS',
    callbackProxyOrWalletMissing: '还没有配置 VITE_CALLBACK_PROXY 或 VITE_WALLET_ADDRESS',
    reactiveListenerMissing: '还没有配置 VITE_REACTIVE_LISTENER_ADDRESS'
  }
} as const

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getStoredLocale(): Locale {
  if (!canUseStorage()) return 'en'
  const locale = window.localStorage.getItem(localeStorageKey)
  return locale === 'zh-CN' ? 'zh-CN' : 'en'
}

type LanguageState = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: getStoredLocale(),
  setLocale: (locale) => {
    if (canUseStorage()) {
      window.localStorage.setItem(localeStorageKey, locale)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
    set({ locale })
  }
}))

export function useCopy() {
  const locale = useLanguageStore((state) => state.locale)
  return { copy: messages[locale], locale }
}

export function useLocaleActions() {
  return useLanguageStore((state) => state.setLocale)
}

export function translateRuntimeStatus(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'active') return copy.active
  if (value === 'paused') return copy.paused
  if (value === 'exhausted') return copy.exhausted
  return copy.inactive
}

export function translateConnectionLabel(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'Browser Wallet') return copy.browserWallet
  if (value === 'Web Wallet') return copy.webWallet
  if (value === 'Not connected') return copy.notConnected
  return value
}

export function translateBalanceContextLabel(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'Controller wallet balance') return copy.controllerWalletBalance
  if (value === 'Autonomous wallet contract balance') return copy.autonomousWalletBalance
  return value
}

export function translateCreditLabel(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'Healthy') return copy.healthy
  if (value === 'Low') return copy.low
  if (value === 'Unknown') return copy.unknown
  if (value === 'Unavailable') return copy.unavailable
  return value
}

export function translateDisplayValue(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'Not connected') return copy.notConnected
  if (value === 'Unknown') return copy.unknown
  if (value === 'Unavailable') return copy.unavailable
  if (value === 'Never') return copy.never
  if (value === 'Not configured') return copy.notConfigured
  return value
}

function startsWithAny(value: string, prefixes: string[]) {
  return prefixes.find((prefix) => value.startsWith(prefix)) ?? null
}

export function translateStatusBanner(value: string, locale: Locale) {
  const copy = messages[locale]
  const allMessages = Object.values(messages)

  const exactMap = [
    ['readyBindWallet', copy.readyBindWallet],
    ['preparingWalletSession', copy.preparingWalletSession],
    ['readyToConnectWallet', copy.readyToConnectWallet],
    ['initializeWalletFailed', copy.initializeWalletFailed],
    ['failedInitializeWallet', copy.failedInitializeWallet],
    ['connectingBrowserWallet', copy.connectingBrowserWallet],
    ['browserWalletConnectionFailed', copy.browserWalletConnectionFailed],
    ['failedConnectBrowserWallet', copy.failedConnectBrowserWallet],
    ['creatingWebWallet', copy.creatingWebWallet],
    ['webWalletCreationFailed', copy.webWalletCreationFailed],
    ['failedCreateWebWallet', copy.failedCreateWebWallet],
    ['importingWebWalletStatus', copy.importingWebWalletStatus],
    ['webWalletImportFailed', copy.webWalletImportFailed],
    ['failedImportWebWallet', copy.failedImportWebWallet],
    ['disconnectingWalletSession', copy.disconnectingWalletSession],
    ['walletDisconnected', copy.walletDisconnected],
    ['walletDisconnectFailed', copy.walletDisconnectFailed],
    ['failedDisconnectWallet', copy.failedDisconnectWallet],
    ['initializingAutonomousWallet', copy.initializingAutonomousWallet],
    ['initializeAutonomousWallet', copy.initializeAutonomousWallet],
    ['refreshingWalletState', copy.refreshingWalletState],
    ['walletStateRefreshed', copy.walletStateRefreshed],
    ['refreshFailed', copy.refreshFailed],
    ['failedRefreshChainState', copy.failedRefreshChainState],
    ['submittingIntentTransaction', copy.submittingIntentTransaction],
    ['intentConfigurationFailed', copy.intentConfigurationFailed],
    ['failedConfigureIntent', copy.failedConfigureIntent],
    ['fundingAutomationCredit', copy.fundingAutomationCredit],
    ['automationFundingFailed', copy.automationFundingFailed],
    ['failedFundAutomation', copy.failedFundAutomation],
    ['fundingAutonomousWallet', copy.fundingAutonomousWallet],
    ['autonomousWalletFundingFailed', copy.autonomousWalletFundingFailed],
    ['failedFundAutonomousWallet', copy.failedFundAutonomousWallet],
    ['pausingIntent', copy.pausingIntent],
    ['pauseFailed', copy.pauseFailed],
    ['failedPauseIntent', copy.failedPauseIntent],
    ['resumingIntent', copy.resumingIntent],
    ['resumeFailed', copy.resumeFailed],
    ['failedResumeIntent', copy.failedResumeIntent],
    ['pausingReactiveListener', copy.pausingReactiveListener],
    ['reactiveListenerPauseFailed', copy.reactiveListenerPauseFailed],
    ['failedPauseReactiveListener', copy.failedPauseReactiveListener],
    ['resumingReactiveListener', copy.resumingReactiveListener],
    ['reactiveListenerResumeFailed', copy.reactiveListenerResumeFailed],
    ['failedResumeReactiveListener', copy.failedResumeReactiveListener],
    ['emittingSourceSignal', copy.emittingSourceSignal],
    ['signalEmissionFailed', copy.signalEmissionFailed],
    ['failedEmitSourceSignal', copy.failedEmitSourceSignal],
    ['connectedWalletMismatch', copy.connectedWalletMismatch],
    ['initializeWalletToContinue', copy.initializeWalletToContinue],
    ['walletAccessUnavailable', copy.walletAccessUnavailable],
    ['walletFactoryMissing', copy.walletFactoryMissing],
    ['walletNotInitialized', copy.walletNotInitialized],
    ['reactiveListenerMissing', copy.reactiveListenerMissing]
  ] as const

  for (const [key, translated] of exactMap) {
    if (allMessages.some((messageSet) => messageSet[key] === value)) {
      return translated
    }
  }

  const prefixedMap = [
    ['restoredWebWallet', copy.restoredWebWallet],
    ['connectedWalletPrefix', copy.connectedWalletPrefix],
    ['createdWebWallet', copy.createdWebWallet],
    ['importedWebWallet', copy.importedWebWallet],
    ['intentConfiguredAction', copy.intentConfiguredAction],
    ['intentPausedAction', copy.intentPausedAction],
    ['intentResumedAction', copy.intentResumedAction],
    ['sourceSignalEmittedAction', copy.sourceSignalEmittedAction],
    ['automationCreditToppedUpAction', copy.automationCreditToppedUpAction],
    ['autonomousWalletFundedAction', copy.autonomousWalletFundedAction],
    ['reactiveListenerPausedAction', copy.reactiveListenerPausedAction],
    ['reactiveListenerResumedAction', copy.reactiveListenerResumedAction],
    ['autonomousWalletCreatedAction', copy.autonomousWalletCreatedAction]
  ] as const

  for (const [key, translatedPrefix] of prefixedMap) {
    const matchedPrefix = startsWithAny(
      value,
      allMessages.map((messageSet) => messageSet[key])
    )
    if (matchedPrefix) {
      return `${translatedPrefix}${value.slice(matchedPrefix.length)}`
    }
  }

  return value
}

export function translateSubscriptionStatus(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'armed') return copy.subscriptionArmed
  if (value === 'missing') return copy.subscriptionMissing
  return copy.unavailable
}

export function translateChainLabel(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'origin') return copy.origin
  if (value === 'reactive') return copy.reactive
  return copy.destination
}

export function translateProofLabel(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'Origin Signal') return copy.originSignal
  if (value === 'Reactive Callback' || value === 'Reactive Dispatch') return copy.reactiveCallbackLabel
  if (value === 'Destination Execution') return copy.destinationExecution
  if (value === 'Destination Skipped') return copy.destinationSkipped
  return value
}

export function translateProofDescription(label: string, description: string, locale: Locale) {
  const copy = messages[locale]
  if (label === 'Origin Signal') return copy.originSignalDesc
  if (label === 'Reactive Callback' || label === 'Reactive Dispatch') return copy.reactiveCallbackDesc
  if (label === 'Destination Execution') return copy.destinationExecutionDesc
  if (label === 'Destination Skipped') return copy.destinationSkippedDesc
  return description
}

export function translateProofStatus(value: 'observed' | 'success' | 'skipped', locale: Locale) {
  const copy = messages[locale]
  if (value === 'success') return copy.successStatus
  if (value === 'skipped') return copy.skippedStatus
  return copy.observedStatus
}

export function getMessages(locale: Locale) {
  return messages[locale]
}
