import { create } from 'zustand'

export type Locale = 'en' | 'zh-CN'

const localeStorageKey = 'willlead.locale'

const messages = {
  en: {
    localeEnglish: 'EN',
    localeChinese: '简体中文',
    heroEyebrow: 'Reactive-native Wallet MVP',
    heroHeadline: 'The wallet that keeps executing after the frontend goes offline.',
    heroCopy: 'Event-driven execution built into the wallet itself.',
    heroSubcopy: 'Save one intent. Wait for events. Show the proof trail.',
    heroBadgeOffline: 'Frontend can go offline',
    heroBadgeProtocol: 'Real protocol events',
    heroBadgeProof: 'Onchain proof trail',
    heroChecklistTitle: 'Demo Flow',
    heroChecklistWallet: 'Connect or restore the controlling wallet',
    heroChecklistIntent: 'Save one wallet intent onchain',
    heroChecklistProof: 'Watch the proof trail complete end-to-end',
    utilityActions: 'Utility actions',
    utilityActionsNote:
      'Fund the autonomous wallet for execution, or add a watched ERC20 to inspect token balances.',
    transferIntentCardNote: 'Fixed-amount transfer that keeps executing after matching source events.',
    swapIntentCardNote: 'Live Uniswap swap route that triggers an autonomous faucet request.',
    connectWallet: 'Connect Wallet',
    disconnectWallet: 'Disconnect Wallet',
    connectHint: 'Connect first, then configure the first intent.',
    connectedHint: 'connected. Click above to disconnect this session.',
    walletAccessUnavailable: 'Wallet binding is unavailable until chain state can be read.',
    executionHistoryPartialWarning:
      'Some execution history could not be loaded. Check the current RPC endpoints and refresh again.',
    executionHistoryRefreshFailed:
      'Execution history refresh failed. Check the current RPC endpoints and try again.',
    connectWalletToLoadRuntime: 'Connect the controlling wallet to load listener state and execution history.',
    initializeWalletToContinue: 'No autonomous wallet exists for this address yet. Initialize one to continue.',
    connectedWalletMismatch:
      'Connected wallet does not control the configured autonomous wallet, so no listener state is shown.',
    walletView: 'Wallet View',
    executionModeSummary: 'Execution mode',
    selectedIntentSummary: 'Selected intent',
    runtimeSummary: 'Runtime',
    proofCountSummary: 'Proof entries',
    overviewTab: 'Overview',
    overviewDesc: 'Balance, identity, execution runway, and automation credit.',
    planTab: 'Intent Plans',
    planDesc: 'Choose which onchain intent this wallet should expose and inspect.',
    automationTab: 'Runtime',
    automationDesc: 'Inspect the selected intent runtime route, activation state, and execution path.',
    activityTab: 'Activity',
    activityDesc: 'Review recent origin signals, callbacks, executions, and skipped runs.',
    walletOverviewTitle: 'Wallet Overview',
    transferPlanTitle: 'Intent Plans',
    automationTitle: 'Wallet Runtime',
    activityTitle: 'Activity Ledger',
    walletOverviewKicker: 'Wallet Overview',
    controllerWalletBalance: 'Controller wallet balance',
    primaryExecutionView: 'Sepolia Execution',
    lasnaExecutionView: 'Lasna Execution',
    executionEnvironmentNote: 'Switch the autonomous wallet and proof view for the selected execution chain.',
    controller: 'Controller',
    signingSource: 'Signing source',
    autonomousWalletBalance: 'Autonomous wallet contract balance',
    autonomousWallet: 'Autonomous wallet',
    executionMode: 'Execution mode',
    reactiveCallback: 'Reactive callback',
    controllerWalletAssets: 'Controller wallet assets',
    controllerAssetsEmpty: 'Connect the controller wallet to load controller assets.',
    autonomousWalletAssets: 'Autonomous wallet assets',
    autonomousAssetsEmpty:
      'Connect the wallet that owns this autonomous wallet to load its balance and assets.',
    fundAutonomousWallet: 'Fund Autonomous Wallet',
    fundingAutonomousWalletShort: 'Funding...',
    autonomousWalletFundingNote:
      'Send native execution funds into the autonomous wallet itself. This is separate from automation credit.',
    watchToken: 'Watch ERC20',
    watchTokenPlaceholder: 'ERC20 token address',
    watchTokenNote:
      'Token discovery is manual in this MVP. Add an ERC20 address to load balances for both the controller wallet and the autonomous wallet.',
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
    automationNote: 'Separate credit that keeps callbacks alive after the frontend goes offline.',
    listenerPaused: 'Listener Paused',
    listenerArmed: 'Listener Armed',
    availableAutomationCredit: 'Available automation credit',
    health: 'Health',
    requiredFloor: 'Required floor',
    listenerStatus: 'Listener status',
    operatorService: 'Operator service',
    operatorLastHeartbeat: 'Operator heartbeat',
    listenerRuntimeBalance: 'Listener runtime balance',
    listenerRuntimeDebt: 'Listener runtime debt',
    lastFundingAction: 'Last funding action',
    singleSignatureMode: 'Single-signature mode',
    singleSignatureReady: 'Ready',
    singleSignatureRequiresOperator: 'Operator required',
    singleSignatureUnavailable: 'Unavailable',
    singleSignatureReadyNote:
      'The operator runtime is online, so saving the plan once is enough to arm the listener and wait for the next external signal.',
    singleSignatureRequiresOperatorNote:
      'The operator runtime is offline. Single-signature testing stays disabled until the operator comes back online for this wallet.',
    listenerRuntimeHealthyNote:
      'Listener runtime balance is above current debt, so Reactive dispatch can continue without manual funding.',
    automationReadinessLabel: 'Automation readiness',
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
    listenerRoutingKicker: 'Wallet Runtime Route',
    listenerRoutingNote: 'The wallet only executes when this route is bound and armed.',
    refreshCredit: 'Refresh Credit',
    refreshing: 'Refreshing...',
    topUpAutomation: 'Top Up Automation',
    intentPickerKicker: 'Intent Selector',
    intentPickerNote: 'Pick the intent to inspect.',
    transferIntentLabel: 'Transfer Intent',
    swapIntentLabel: 'Swap -> lREACT Intent',
    transferPlanKicker: 'Transfer Intent',
    transferPlanNote: 'Set the transfer this wallet should keep executing.',
    advancedRouteSettings: 'Advanced route settings',
    advancedRouteNote:
      'Open this section only if you need to change the listener, source contract, or chain route.',
    planRouteNote:
      'These route fields bind the wallet to a specific listener and source event path. Update them when switching to another deployed Reactive route.',
    destinationChainLockedNote:
      'In the current MVP, the execution destination chain is fixed to the deployed wallet chain. Only the source event route should be switched here.',
    useCurrentRoute: 'Use Current Route',
    planSigningNote:
      'Saving this plan signs the wallet intent only. The shared listener is already armed by the operator, so no extra start-listening signature is required.',
    initializeAutonomousWallet: 'Initialize Autonomous Wallet',
    initializingAutonomousWallet: 'Initializing wallet...',
    initializeAutonomousWalletNote:
      'Deploy a dedicated autonomous wallet for this owner before configuring the first intent.',
    assetType: 'Asset Type',
    nativeAsset: 'Native Asset',
    erc20Asset: 'ERC20 Token',
    enabled: 'Enabled',
    disabled: 'Disabled',
    token: 'Token',
    erc20TokenAddress: 'ERC20 token address',
    tokenFieldNote:
      'Choose Native Asset to transfer the destination-chain gas asset, or ERC20 Token to transfer a token held by the autonomous wallet.',
    destinationAmountNote:
      'Amount per execution and minimum automation balance are denominated in the current execution chain native asset',
    recipient: 'Recipient',
    amountPerExecution: 'Amount / Execution',
    maxExecutions: 'Max Executions',
    remaining: 'Remaining',
    minAutomationBalance: 'Min Automation Balance',
    saving: 'Saving...',
    saveTransferPlan: 'Save Transfer Plan',
    switchingExecutionEnvironment: 'Switching execution environment...',
    executionEnvironmentSwitched: 'Execution environment switched.',
    executionEnvironmentSwitchFailed: 'Execution environment switch failed.',
    addingWatchedToken: 'Adding watched token...',
    addWatchedTokenFailed: 'Add watched token failed.',
    failedAddWatchedToken: 'Failed to add watched token',
    pausePlan: 'Pause Plan',
    resumePlan: 'Resume Plan',
    swapIntentKicker: 'Swap Intent',
    swapIntentNote:
      'This demo intent listens across the four live Uniswap v3 Sepolia WETH/Circle USDC fee tiers and lets the autonomous wallet request lREACT through the Reactive faucet route.',
    upstreamProtocol: 'Upstream protocol',
    triggerEvent: 'Trigger event',
    sourcePair: 'Source pair',
    watchedPool: 'Watched pool',
    executionContract: 'Execution contract',
    executionContractBalance: 'Execution balance',
    executionAction: 'Execution action',
    executionFundingPerTrigger: 'Funding / Trigger',
    callbackReserve: 'Callback reserve',
    callbackDebt: 'Callback debt',
    destinationNetwork: 'Destination network',
    destinationAsset: 'Destination asset',
    swapIntentLiveRouteNote:
      'This live demo path is now bound to four verified Sepolia ETH / USDC v3 fee tiers through one multi-source listener.',
    swapIntentNoManualSignal:
      'Unlike the transfer intent, this route does not use a manual source signal. A qualifying Uniswap swap is the trigger.',
    swapIntentPrimaryEnvironmentNote:
      'This swap intent is currently deployed on the Sepolia execution environment. Switch back to Sepolia Execution to inspect the live route.',
    swapIntentSaveNote:
      'Saving writes the recipient, funding amount per trigger, and max executions into the autonomous wallet. After that, matching swaps can trigger the wallet automatically.',
    swapIntentFundingNote:
      'Automation top-up only adds callback proxy credit. The per-trigger ETH sent to the faucet is paid from the autonomous wallet execution balance shown above.',
    saveSwapIntent: 'Save Swap Intent',
    automationEngineKicker: 'Wallet Runtime',
    automationEngineNote: 'Monitor the runtime route that turns external source events into autonomous wallet execution.',
    runtimeReadinessKicker: 'Runtime readiness',
    runtimeReadinessNote: 'The quickest read on whether the next external event can complete end-to-end.',
    swapRuntimeKicker: 'Swap Intent Runtime',
    swapRuntimeNote:
      'Watch the runtime route that turns matching Uniswap swaps into autonomous wallet faucet requests. Manual test-signal controls are intentionally removed here.',
    lastExecutionNonce: 'Last Execution Nonce',
    lastExecutedAt: 'Last Executed At',
    lastSignalHash: 'Last Signal Hash',
    balanceDelta: 'Balance Delta',
    emitSourceSignal: 'Emit Source Signal',
    testSourceEvent: 'Test Source Event',
    triggering: 'Triggering...',
    pauseListener: 'Pause Listener',
    resumeListener: 'Resume Listener',
    latestSourceProof: 'Latest source proof',
    latestDestinationProof: 'Latest destination proof',
    externalSignalNote:
      'In the normal flow, source events are triggered by an external operator or upstream protocol, not by the user wallet.',
    testSourceEventNote:
      'Use the test button only for demo validation. It only goes through the operator relay so the user wallet does not need to sign a second source-chain transaction.',
    swapRuntimeExternalTriggerNote:
      'The next upstream Uniswap swap is the source event for this runtime.',
    swapRuntimeNoManualTriggerNote:
      'Manual source event testing is disabled for this intent because the trigger comes from the watched pool itself.',
    swapIntentTriggeredStatus: 'Swap intent executed from source tx',
    activityKicker: 'Activity Ledger',
    activityNote: 'Rolling proof of what the wallet observed, executed, or skipped.',
    proofFlowTitle: 'Proof Flow',
    proofFlowNote:
      'A strong demo should show the path from source event to Reactive dispatch to destination outcome.',
    sourceStage: 'Source event',
    reactiveStage: 'Reactive dispatch',
    destinationStage: 'Destination outcome',
    chainEvidence: 'Chain Evidence',
    activityEmpty: 'No execution history yet for this wallet.',
    loadingExecutionHistory: 'Loading recent chain history...',
    historyDiagnosticsLabel: 'History diagnostics',
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
    online: 'Online',
    offline: 'Offline',
    low: 'Low',
    unknown: 'Unknown',
    fundedAndCleared: 'Funded and cleared',
    alreadyFunded: 'Already funded',
    funded: 'Funded',
    unavailable: 'Unavailable',
    waitingForSignal: 'Waiting for signal',
    armingListener: 'Arming listener',
    listenerUnarmed: 'Listener not armed',
    intentPausedReadiness: 'Intent paused',
    intentInactiveReadiness: 'Intent inactive',
    intentExhaustedReadiness: 'Intent exhausted',
    never: 'Never',
    notConfigured: 'Not configured',
    origin: 'Origin',
    reactive: 'Reactive',
    destination: 'Destination',
    originSignal: 'Origin Signal',
    reactiveCallbackLabel: 'Reactive Dispatch',
    walletRuntimeBound: 'Wallet Runtime Bound',
    destinationExecution: 'Destination Execution',
    destinationSkipped: 'Destination Skipped',
    originSignalDesc: 'Signal emitted on the source chain.',
    reactiveCallbackDesc: 'Reactive system accepted the listener job and dispatched the destination callback.',
    walletRuntimeBoundDesc: 'Autonomous wallet declared its Reactive runtime route onchain.',
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
    rpcChainMismatch:
      '{label} is pointing at the wrong chain. Expected {expectedName} ({expectedId}), got chain id {actualId}. Update the RPC URL and try again.',
    submittingIntentTransaction: 'Saving transfer plan to the autonomous wallet...',
    intentConfigurationFailed: 'Intent configuration failed.',
    failedConfigureIntent: 'Failed to configure intent',
    submittingSwapIntentTransaction: 'Saving swap intent to the autonomous wallet...',
    swapIntentConfigurationFailed: 'Swap intent configuration failed.',
    failedConfigureSwapIntent: 'Failed to configure swap intent',
    fundingAutomationCredit: 'Funding automation credit...',
    automationFundingFailed: 'Automation funding failed.',
    failedFundAutomation: 'Failed to fund automation credit',
    fundingAutonomousWallet: 'Funding autonomous wallet...',
    autonomousWalletFundingFailed: 'Autonomous wallet funding failed.',
    failedFundAutonomousWallet: 'Failed to fund autonomous wallet',
    pausingIntent: 'Pausing intent...',
    pauseFailed: 'Pause failed.',
    failedPauseIntent: 'Failed to pause intent',
    pausingSwapIntent: 'Pausing swap intent...',
    swapIntentPauseFailed: 'Swap intent pause failed.',
    failedPauseSwapIntent: 'Failed to pause swap intent',
    resumingIntent: 'Resuming intent...',
    resumeFailed: 'Resume failed.',
    failedResumeIntent: 'Failed to resume intent',
    resumingSwapIntent: 'Resuming swap intent...',
    swapIntentResumeFailed: 'Swap intent resume failed.',
    failedResumeSwapIntent: 'Failed to resume swap intent',
    pausingReactiveListener: 'Pausing reactive listener...',
    reactiveListenerPauseFailed: 'Reactive listener pause failed.',
    failedPauseReactiveListener: 'Failed to pause reactive listener',
    resumingReactiveListener: 'Resuming reactive listener...',
    reactiveListenerResumeFailed: 'Reactive listener resume failed.',
    failedResumeReactiveListener: 'Failed to resume reactive listener',
    emittingSourceSignal: 'Emitting source signal...',
    awaitingAutomationResult: 'Waiting for destination execution...',
    automationResultDetected: 'Destination execution detected.',
    destinationExecutionDetected: 'Destination execution confirmed.',
    destinationSkippedDetected: 'Destination callback was skipped:',
    automationStillPending:
      'Source signal was sent, but destination execution is still pending. Refresh again if it takes longer.',
    signalEmissionFailed: 'Signal emission failed.',
    failedEmitSourceSignal: 'Failed to emit source signal',
    sourceSignalUnavailable: 'Source signal route is unavailable for this wallet.',
    reactiveRouteVerificationUnavailable:
      'Reactive route verification is unavailable. Check the Reactive RPC configuration and try again.',
    runtimeRouteValidationFailed:
      'The requested runtime route does not match the selected listener deployment.',
    runtimeRouteListenerUnreadable:
      'The selected listener cannot be read from the Reactive chain.',
    runtimeRouteEmitterMismatch:
      'The selected listener is wired to a different source emitter.',
    runtimeRouteSourceChainMismatch:
      'The selected listener is wired to a different source chain id.',
    runtimeRouteDestinationChainMismatch:
      'The selected listener is wired to a different destination chain id.',
    runtimeRouteTopicMismatch:
      'The selected listener is wired to a different source event topic.',
    runtimeRouteOriginConfigMismatch:
      'The requested runtime route is pointing at a different origin chain than the app is currently configured for.',
    runtimeRouteDestinationConfigMismatch:
      'The requested runtime route is pointing at a different destination chain than the app is currently configured for.',
    operatorServiceRequiredForTestSignal:
      'To emit a test source signal without asking the user wallet to sign again, the operator service for this wallet must be online.',
    testSignalBlockedExhausted:
      'This intent is already exhausted. Save a new plan before sending another source signal.',
    testSignalBlockedPaused: 'This intent is paused. Resume it before sending another source signal.',
    testSignalBlockedInactive:
      'This wallet runtime is not active yet. Save or resume a plan before sending another source signal.',
    testSignalBlockedMirrorInactive:
      'The operator has not mirrored the active intent to the source emitter yet.',
    testSignalMirrorPending:
      'The operator is still syncing the latest plan to the source emitter. Test-signal requests will resync before sending.',
    intentConfiguredAction: 'Transfer Plan Saved',
    intentConfiguredDesc:
      'Saved the wallet intent onchain. The shared listener remains armed by the operator for future external triggers.',
    swapIntentConfiguredAction: 'Swap Intent Saved',
    swapIntentConfiguredDesc:
      'Saved the faucet execution intent onchain. The next matching Uniswap swap can now trigger the callback automatically.',
    awaitingListenerArming: 'Transfer plan saved. Waiting for the shared listener to arm...',
    listenerArmedForIntent:
      'Transfer plan saved. Shared listener is armed and ready for future external triggers.',
    intentPausedAction: 'Intent Paused',
    intentPausedDesc: 'Paused reactive execution on the destination wallet.',
    intentResumedAction: 'Intent Resumed',
    intentResumedDesc: 'Reactivated reactive execution on the destination wallet.',
    swapIntentPausedAction: 'Swap Intent Paused',
    swapIntentPausedDesc: 'Paused the upstream swap-triggered faucet route.',
    swapIntentResumedAction: 'Swap Intent Resumed',
    swapIntentResumedDesc: 'Reactivated the upstream swap-triggered faucet route.',
    watchedTokenAddedAction: 'Watched Token Added',
    watchedTokenAddedDesc: 'Added ERC20 token to the watched asset list:',
    sourceSignalEmittedAction: 'Source Signal Emitted',
    sourceSignalEmittedDesc: 'The operator relay emitted the origin-chain test StrategySignal for this wallet.',
    automationCreditToppedUpAction: 'Automation Credit Topped Up',
    automationCreditToppedUpDesc:
      'Deposited funds into the callback proxy for wallet automation.',
    autonomousWalletFundedAction: 'Autonomous Wallet Funded',
    autonomousWalletFundedDesc: 'Transferred native execution funds into the autonomous wallet.',
    reactiveListenerPausedAction: 'Reactive Listener Paused',
    reactiveListenerPausedDesc: 'Paused the reactive listener subscription set.',
    reactiveListenerResumedAction: 'Reactive Listener Resumed',
    reactiveListenerResumedDesc: 'Resumed the reactive listener subscription set.',
    reactiveListenerArmedAction: 'Reactive Listener Armed',
    reactiveListenerArmedDesc:
      'Re-armed the shared listener after saving the transfer plan so future external events can trigger callbacks.',
    autonomousWalletCreatedAction: 'Autonomous Wallet Ready',
    autonomousWalletCreatedDesc: 'Created or recovered the autonomous wallet bound to this owner.',
    walletAddressMissing: 'VITE_WALLET_ADDRESS is not configured',
    walletFactoryMissing: 'VITE_WALLET_FACTORY_ADDRESS is not configured',
    walletNotInitialized: 'No autonomous wallet is registered for the connected owner yet.',
    swapIntentUnsupported: 'This swap intent is not deployed on the current execution environment.',
    signalEmitterOrWalletMissing: 'VITE_SIGNAL_EMITTER_ADDRESS or VITE_WALLET_ADDRESS is not configured',
    callbackProxyOrWalletMissing: 'VITE_CALLBACK_PROXY or VITE_WALLET_ADDRESS is not configured',
    reactiveListenerMissing: 'VITE_REACTIVE_LISTENER_ADDRESS is not configured'
  },
  'zh-CN': {
    localeEnglish: 'EN',
    localeChinese: '简体中文',
    heroEyebrow: 'Reactive 原生钱包 MVP',
    heroHeadline: '前端离线后，仍能持续执行用户 intent 的钱包。',
    heroCopy: '把事件驱动执行直接做进钱包本体。',
    heroSubcopy: '先保存一次 intent，再等待事件触发并展示 proof。',
    heroBadgeOffline: '前端离线后仍可工作',
    heroBadgeProtocol: '真实协议事件触发',
    heroBadgeProof: '链上 proof 可验证',
    heroChecklistTitle: 'Demo 流程',
    heroChecklistWallet: '连接或恢复控制钱包',
    heroChecklistIntent: '把一条钱包 intent 写入链上',
    heroChecklistProof: '观察 proof 链路完整跑通',
    utilityActions: '辅助操作',
    utilityActionsNote: '这里用于给 autonomous wallet 补执行资金，或手动添加要观察余额的 ERC20。',
    transferIntentCardNote: '固定金额转账，会在匹配的源事件出现后继续自动执行。',
    swapIntentCardNote: '真实 Uniswap swap 路由，会触发 autonomous wallet 去请求 faucet。',
    connectWallet: '连接钱包',
    disconnectWallet: '断开钱包',
    connectHint: '先连接钱包，再配置第一条 intent。',
    connectedHint: '已连接。点击上方可断开这次会话。',
    walletAccessUnavailable: '链上状态不可读之前，暂时无法确认钱包归属。',
    executionHistoryPartialWarning: '部分链上历史记录暂时读取失败。请检查当前 RPC 配置后再刷新一次。',
    executionHistoryRefreshFailed: '链上历史记录刷新失败。请检查当前 RPC 配置后重试。',
    connectWalletToLoadRuntime: '先连接控制这个自主钱包的地址，才能读取监听状态和执行历史。',
    initializeWalletToContinue: '当前地址还没有对应的自主钱包，需要先初始化后才能继续。',
    connectedWalletMismatch: '当前连接的钱包并不控制这只自主钱包，因此不会展示它的监听和执行状态。',
    walletView: '钱包视图',
    executionModeSummary: '执行环境',
    selectedIntentSummary: '当前 intent',
    runtimeSummary: '运行状态',
    proofCountSummary: 'Proof 条目',
    overviewTab: '总览',
    overviewDesc: '查看资产、身份、执行次数和自动执行额度。',
    planTab: 'Intent 计划',
    planDesc: '选择并查看这只钱包当前要暴露的链上 intent。',
    automationTab: '运行时',
    automationDesc: '查看当前选中 intent 的 runtime route、激活状态和执行路径。',
    activityTab: '链上记录',
    activityDesc: '查看最近的源链信号、回调、成功执行和跳过记录。',
    walletOverviewTitle: '钱包总览',
    transferPlanTitle: 'Intent 计划',
    automationTitle: '钱包运行时',
    activityTitle: '链上记录',
    walletOverviewKicker: '钱包总览',
    controllerWalletBalance: '控制钱包余额',
    primaryExecutionView: 'Sepolia 执行层',
    lasnaExecutionView: 'Lasna 执行层',
    executionEnvironmentNote: '这里切换当前管理的 autonomous wallet 和对应执行链的 proof 视图。',
    controller: '控制钱包',
    signingSource: '签名来源',
    autonomousWalletBalance: '自主执行钱包合约余额',
    autonomousWallet: '自主执行钱包',
    executionMode: '执行方式',
    reactiveCallback: 'Reactive 回调',
    controllerWalletAssets: '控制钱包资产',
    controllerAssetsEmpty: '连接控制钱包后，这里会显示控制钱包资产。',
    autonomousWalletAssets: '自主执行钱包资产',
    autonomousAssetsEmpty: '连接拥有这只自主钱包的地址后，这里才会显示它的余额和资产。',
    fundAutonomousWallet: '补充钱包执行资金',
    fundingAutonomousWalletShort: '充值中...',
    autonomousWalletFundingNote:
      '这里补的是 autonomous wallet 自己的原生执行资产，不是 automation credit。',
    watchToken: '添加 ERC20',
    watchTokenPlaceholder: 'ERC20 代币地址',
    watchTokenNote:
      '当前 MVP 不会自动发现全部代币。手动添加 ERC20 地址后，controller wallet 和 autonomous wallet 两边都会读取它的余额。',
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
    automationNote: '这份额度用于保证前端离线后，Reactive 回调仍能继续落地。',
    listenerPaused: '监听已暂停',
    listenerArmed: '监听已启用',
    availableAutomationCredit: '可用自动执行额度',
    health: '额度状态',
    requiredFloor: '最低保留额度',
    listenerStatus: '监听状态',
    operatorService: 'Operator 服务',
    operatorLastHeartbeat: 'Operator 心跳',
    listenerRuntimeBalance: 'Listener 运行余额',
    listenerRuntimeDebt: 'Listener 当前欠费',
    lastFundingAction: '最近一次补资动作',
    singleSignatureMode: '单签名模式',
    singleSignatureReady: '已就绪',
    singleSignatureRequiresOperator: '需要 Operator 在线',
    singleSignatureUnavailable: '不可用',
    singleSignatureReadyNote:
      '当前 operator runtime 在线，所以用户保存计划只签一次就够，系统会自动把 listener 准备到等待外部 signal 的状态。',
    singleSignatureRequiresOperatorNote:
      '当前 operator runtime 不在线。单签名测试会保持禁用，直到这只钱包对应的 operator 恢复在线。',
    listenerRuntimeHealthyNote:
      '当前 listener 的运行余额高于欠费，Reactive dispatch 不需要再手动补资就能继续运行。',
    automationReadinessLabel: '自动化就绪状态',
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
    listenerRoutingKicker: '钱包运行时路由',
    listenerRoutingNote: '只有这条路由正确绑定并 armed 后，钱包才会继续执行。',
    refreshCredit: '刷新额度',
    refreshing: '刷新中...',
    topUpAutomation: '补充自动执行额度',
    intentPickerKicker: 'Intent 选择',
    intentPickerNote: '选择你现在要查看的 intent。',
    transferIntentLabel: '转账 Intent',
    swapIntentLabel: 'Swap -> lREACT Intent',
    transferPlanKicker: '转账 Intent',
    transferPlanNote: '设置这个钱包要持续执行的转账 intent。',
    advancedRouteSettings: '高级 Route 配置',
    advancedRouteNote:
      '只有在你需要修改 listener、源合约或链路路由时，才需要展开这里。',
    planRouteNote: '这些 route 字段会把钱包绑定到具体的 listener 和 source event path。切到另一套已部署的 Reactive route 时，需要一起更新。',
    destinationChainLockedNote:
      '当前 MVP 里，执行目标链固定为这只钱包实际部署所在的链。这里应该只切换源事件路由，不应该把目标链当成可随意切换的执行落点。',
    useCurrentRoute: '恢复当前 Route',
    planSigningNote:
      '保存这条计划只是在给钱包写入 intent，不是在启动监听。共享 listener 已由 operator 预先 armed，不需要用户再额外签一次“开始监听”。',
    initializeAutonomousWallet: '初始化自主钱包',
    initializingAutonomousWallet: '正在初始化钱包...',
    initializeAutonomousWalletNote: '先为当前 owner 部署一只自主钱包，再配置第一条 intent。',
    assetType: '资产类型',
    nativeAsset: '原生资产',
    erc20Asset: 'ERC20 代币',
    enabled: '已启用',
    disabled: '未启用',
    token: '代币',
    erc20TokenAddress: 'ERC20 代币地址',
    tokenFieldNote:
      '选择“原生资产”时，转的是目标链 gas 资产；选择“ERC20 代币”时，转的是这只 autonomous wallet 当前持有的目标链代币。',
    destinationAmountNote: '每次执行金额和自动执行最低额度都以当前执行环境的原生币计价',
    recipient: '收款地址',
    amountPerExecution: '每次执行金额',
    maxExecutions: '最大执行次数',
    remaining: '剩余次数',
    minAutomationBalance: '自动执行最低额度',
    saving: '保存中...',
    saveTransferPlan: '保存转账计划',
    switchingExecutionEnvironment: '正在切换执行环境...',
    executionEnvironmentSwitched: '执行环境已切换。',
    executionEnvironmentSwitchFailed: '执行环境切换失败。',
    addingWatchedToken: '正在添加观察代币...',
    addWatchedTokenFailed: '添加观察代币失败。',
    failedAddWatchedToken: '添加观察代币失败',
    pausePlan: '暂停计划',
    resumePlan: '恢复计划',
    swapIntentKicker: 'Swap Intent',
    swapIntentNote: '这条 demo intent 会监听 Uniswap Sepolia 上 WETH/Circle USDC 的 4 个 live v3 fee tier 池子，并由 autonomous wallet 通过 Reactive faucet 路由去请求 lREACT。',
    upstreamProtocol: '上游协议',
    triggerEvent: '触发事件',
    sourcePair: '源资产对',
    watchedPool: '监听池子',
    executionContract: '执行合约',
    executionContractBalance: '执行余额',
    executionAction: '执行动作',
    executionFundingPerTrigger: '每次触发资金',
    callbackReserve: '回调储备金',
    callbackDebt: '回调欠费',
    destinationNetwork: '目标网络',
    destinationAsset: '目标资产',
    swapIntentLiveRouteNote: '这条 live demo 路径现在已经通过一只 multi-source listener 绑定到 4 个已验证的 Sepolia ETH / USDC v3 fee tier 池子。',
    swapIntentNoManualSignal: '和转账 intent 不同，这条路由不需要手动发送源信号。只要有符合条件的 Uniswap swap，就会成为触发源。',
    swapIntentPrimaryEnvironmentNote: '这条 swap intent 当前部署在 Sepolia execution 环境。如果你切到了别的执行环境，请先切回 Sepolia 再查看真实路由。',
    swapIntentSaveNote: '保存后会把 recipient、每次触发金额和最大执行次数写进 autonomous wallet。后续只要有符合条件的 swap，这只钱包就会自动响应。',
    swapIntentFundingNote: '这里补的只是 callback proxy 额度。真正每次发给 faucet 的 ETH，会从上面显示的 autonomous wallet 执行余额里扣。',
    saveSwapIntent: '保存 Swap Intent',
    automationEngineKicker: '钱包运行时',
    automationEngineNote: '查看外部源事件如何经过 Reactive runtime route 并落到 autonomous wallet 执行。',
    runtimeReadinessKicker: '运行时就绪度',
    runtimeReadinessNote: '下面三项能最快判断下一次外部事件能不能完整跑通。',
    swapRuntimeKicker: 'Swap Intent 运行时',
    swapRuntimeNote: '查看匹配的 Uniswap swap 如何进入 autonomous wallet 并触发 faucet request。这里会刻意移除手动测试信号按钮。',
    lastExecutionNonce: '最近执行序号',
    lastExecutedAt: '最近执行时间',
    lastSignalHash: '最近信号哈希',
    balanceDelta: '余额变化',
    emitSourceSignal: '发送源链信号',
    testSourceEvent: '测试源事件',
    triggering: '触发中...',
    pauseListener: '暂停监听',
    resumeListener: '恢复监听',
    latestSourceProof: '最近源链 proof',
    latestDestinationProof: '最近目标 proof',
    externalSignalNote:
      '正常流程里，源事件应由外部 operator 或上游协议触发，而不是由用户钱包自己触发。',
    testSourceEventNote:
      '下面这个按钮只用于 demo 验证。它只会走 operator relay，这样用户钱包不需要为源链测试再签第二笔交易。',
    swapRuntimeExternalTriggerNote: '下一笔符合条件的 Uniswap swap 就是这条 runtime 的源事件。',
    swapRuntimeNoManualTriggerNote: '这条 intent 的触发源来自被监听的池子本身，所以这里不提供手动测试源事件。',
    swapIntentTriggeredStatus: 'Swap intent 已从这笔源链交易执行',
    activityKicker: '链上记录',
    activityNote: '这里展示钱包观察到、完成或跳过的 proof 历史。',
    proofFlowTitle: 'Proof 流程',
    proofFlowNote: '一次完整 demo 最好能清楚地看到源事件、Reactive 派发和目标链结果这三步。',
    sourceStage: '源事件',
    reactiveStage: 'Reactive 派发',
    destinationStage: '目标链结果',
    chainEvidence: '链上证据',
    activityEmpty: '这只钱包目前还没有执行历史。',
    loadingExecutionHistory: '正在读取最近的链上历史...',
    historyDiagnosticsLabel: '历史诊断',
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
    online: '在线',
    offline: '离线',
    low: '偏低',
    unknown: '待确认',
    fundedAndCleared: '已补资并清账',
    alreadyFunded: '资金已充足',
    funded: '已补资',
    unavailable: '不可用',
    waitingForSignal: '等待信号',
    armingListener: '正在准备监听',
    listenerUnarmed: '监听尚未 armed',
    intentPausedReadiness: '计划已暂停',
    intentInactiveReadiness: '计划未启用',
    intentExhaustedReadiness: '计划已耗尽',
    never: '暂无',
    notConfigured: '未配置',
    origin: '源链',
    reactive: 'Reactive',
    destination: '目标链',
    originSignal: '源链信号',
    reactiveCallbackLabel: 'Reactive 派发',
    walletRuntimeBound: '钱包运行时已绑定',
    destinationExecution: '目标链执行',
    destinationSkipped: '目标链跳过',
    originSignalDesc: '信号已在源链发出。',
    reactiveCallbackDesc: 'Reactive system 已接收这次监听任务，并向目标链发起回调派发。',
    walletRuntimeBoundDesc: 'autonomous wallet 已在链上声明自己的 Reactive runtime route。',
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
    rpcChainMismatch:
      '{label} 指到了错误链。预期是 {expectedName}（{expectedId}），实际拿到的 chain id 是 {actualId}。请修正 RPC URL 后重试。',
    submittingIntentTransaction: '正在把转账计划写入自主钱包...',
    intentConfigurationFailed: '转账计划配置失败。',
    failedConfigureIntent: '配置转账计划失败',
    submittingSwapIntentTransaction: '正在把 swap intent 写入 autonomous wallet...',
    swapIntentConfigurationFailed: 'Swap intent 配置失败。',
    failedConfigureSwapIntent: '配置 swap intent 失败',
    fundingAutomationCredit: '正在补充自动执行额度...',
    automationFundingFailed: '自动执行额度补充失败。',
    failedFundAutomation: '补充自动执行额度失败',
    fundingAutonomousWallet: '正在补充自主钱包执行资金...',
    autonomousWalletFundingFailed: '自主钱包执行资金补充失败。',
    failedFundAutonomousWallet: '补充自主钱包执行资金失败',
    pausingIntent: '正在暂停计划...',
    pauseFailed: '暂停失败。',
    failedPauseIntent: '暂停计划失败',
    pausingSwapIntent: '正在暂停 swap intent...',
    swapIntentPauseFailed: 'Swap intent 暂停失败。',
    failedPauseSwapIntent: '暂停 swap intent 失败',
    resumingIntent: '正在恢复计划...',
    resumeFailed: '恢复失败。',
    failedResumeIntent: '恢复计划失败',
    resumingSwapIntent: '正在恢复 swap intent...',
    swapIntentResumeFailed: 'Swap intent 恢复失败。',
    failedResumeSwapIntent: '恢复 swap intent 失败',
    pausingReactiveListener: '正在暂停 Reactive 监听...',
    reactiveListenerPauseFailed: 'Reactive 监听暂停失败。',
    failedPauseReactiveListener: '暂停 Reactive 监听失败',
    resumingReactiveListener: '正在恢复 Reactive 监听...',
    reactiveListenerResumeFailed: 'Reactive 监听恢复失败。',
    failedResumeReactiveListener: '恢复 Reactive 监听失败',
    emittingSourceSignal: '正在发送源链信号...',
    awaitingAutomationResult: '正在等待目标链执行结果...',
    automationResultDetected: '已检测到目标链执行结果。',
    destinationExecutionDetected: '已确认目标链执行。',
    destinationSkippedDetected: '目标链回调已跳过：',
    automationStillPending: '源链信号已经发出，但目标链执行还在等待中。如果更久还没变化，请再手动刷新一次。',
    signalEmissionFailed: '源链信号发送失败。',
    failedEmitSourceSignal: '发送源链信号失败',
    sourceSignalUnavailable: '这只钱包当前没有可用的源链触发路由。',
    reactiveRouteVerificationUnavailable: '当前无法校验 Reactive route。请检查 Reactive RPC 配置后再试。',
    runtimeRouteValidationFailed: '你填写的 runtime route 与选定的 listener 部署不一致。',
    runtimeRouteListenerUnreadable: '当前无法从 Reactive 链读取这个 listener。',
    runtimeRouteEmitterMismatch: '这个 listener 绑定的 source emitter 与当前填写值不一致。',
    runtimeRouteSourceChainMismatch: '这个 listener 绑定的 source chain id 与当前填写值不一致。',
    runtimeRouteDestinationChainMismatch:
      '这个 listener 绑定的 destination chain id 与当前填写值不一致。',
    runtimeRouteTopicMismatch: '这个 listener 绑定的 source event topic 与当前填写值不一致。',
    runtimeRouteOriginConfigMismatch:
      '当前填写的 runtime route 指向的 source chain 与应用当前配置的 origin chain 不一致。',
    runtimeRouteDestinationConfigMismatch:
      '当前填写的 runtime route 指向的 destination chain 与应用当前配置的 destination chain 不一致。',
    operatorServiceRequiredForTestSignal:
      '要想在不让用户再次签名的情况下触发测试源事件，这只钱包对应的 operator service 必须先在线。',
    testSignalBlockedExhausted: '这条计划已经耗尽。请先保存一条新的计划，再发送源链信号。',
    testSignalBlockedPaused: '这条计划当前已暂停。请先恢复计划，再发送源链信号。',
    testSignalBlockedInactive: '这只钱包当前还没有活跃 runtime。请先保存或恢复计划，再发送源链信号。',
    testSignalBlockedMirrorInactive:
      'operator 还没有把当前活跃 intent 镜像到源链 emitter。',
    testSignalMirrorPending:
      'operator 正在把最新计划同步到源链 emitter。测试源事件在发送前会先补做一次同步。',
    intentConfiguredAction: '转账计划已保存',
    intentConfiguredDesc: '已经把钱包 intent 写入链上。共享 listener 仍由 operator 保持 armed，后续外部事件可直接触发执行。',
    swapIntentConfiguredAction: 'Swap intent 已保存',
    swapIntentConfiguredDesc: '已经把 faucet 执行 intent 写入链上。后续只要有符合条件的 Uniswap swap，就可以自动触发回调。',
    awaitingListenerArming: '转账计划已保存，正在等待共享 listener 进入 armed 状态...',
    listenerArmedForIntent: '转账计划已保存。共享 listener 已 armed，后续外部事件可以直接触发执行。',
    intentPausedAction: '转账计划已暂停',
    intentPausedDesc: '目标链钱包的自动执行已暂停。',
    intentResumedAction: '转账计划已恢复',
    intentResumedDesc: '目标链钱包的自动执行已重新启用。',
    swapIntentPausedAction: 'Swap intent 已暂停',
    swapIntentPausedDesc: '上游 swap 触发的 faucet 路由已暂停。',
    swapIntentResumedAction: 'Swap intent 已恢复',
    swapIntentResumedDesc: '上游 swap 触发的 faucet 路由已重新启用。',
    watchedTokenAddedAction: '观察代币已添加',
    watchedTokenAddedDesc: '已把 ERC20 加入资产观察列表：',
    sourceSignalEmittedAction: '源链信号已发出',
    sourceSignalEmittedDesc: 'operator relay 已替这只钱包在源链发出测试 StrategySignal。',
    automationCreditToppedUpAction: '自动执行额度已补充',
    automationCreditToppedUpDesc: '已经向 callback proxy 存入自动执行所需资金。',
    autonomousWalletFundedAction: '自主钱包执行资金已补充',
    autonomousWalletFundedDesc: '已经向自主钱包转入原生执行资产。',
    reactiveListenerPausedAction: 'Reactive 监听已暂停',
    reactiveListenerPausedDesc: 'Reactive 监听订阅集已暂停。',
    reactiveListenerResumedAction: 'Reactive 监听已恢复',
    reactiveListenerResumedDesc: 'Reactive 监听订阅集已恢复。',
    reactiveListenerArmedAction: 'Reactive 监听已 armed',
    reactiveListenerArmedDesc: '保存转账计划后，已重新让共享 listener 进入可工作状态，后续外部事件可直接触发回调。',
    autonomousWalletCreatedAction: '自主钱包已就绪',
    autonomousWalletCreatedDesc: '已经为当前 owner 创建或恢复对应的自主钱包。',
    walletAddressMissing: '还没有配置 VITE_WALLET_ADDRESS',
    walletFactoryMissing: '还没有配置 VITE_WALLET_FACTORY_ADDRESS',
    walletNotInitialized: '当前连接的 owner 还没有注册自主钱包。',
    swapIntentUnsupported: '当前执行环境还没有部署这条 swap intent。',
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

export function translateOperatorServiceStatus(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'online') return copy.online
  if (value === 'offline') return copy.offline
  return copy.unknown
}

export function translateAutomationReadiness(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'waiting_signal') return copy.waitingForSignal
  if (value === 'arming_listener') return copy.armingListener
  if (value === 'listener_paused') return copy.listenerPaused
  if (value === 'listener_unarmed') return copy.listenerUnarmed
  if (value === 'intent_paused') return copy.intentPausedReadiness
  if (value === 'intent_inactive') return copy.intentInactiveReadiness
  if (value === 'intent_exhausted') return copy.intentExhaustedReadiness
  return copy.unavailable
}

export function translateSingleSignatureReadiness(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'ready') return copy.singleSignatureReady
  if (value === 'requires_operator') return copy.singleSignatureRequiresOperator
  return copy.singleSignatureUnavailable
}

export function translateDisplayValue(value: string, locale: Locale) {
  const copy = messages[locale]
  if (value === 'Not connected') return copy.notConnected
  if (value === 'Unknown') return copy.unknown
  if (value === 'funded_and_cleared') return copy.fundedAndCleared
  if (value === 'already_funded') return copy.alreadyFunded
  if (value === 'funded') return copy.funded
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
    ['submittingSwapIntentTransaction', copy.submittingSwapIntentTransaction],
    ['swapIntentConfigurationFailed', copy.swapIntentConfigurationFailed],
    ['failedConfigureSwapIntent', copy.failedConfigureSwapIntent],
    ['fundingAutomationCredit', copy.fundingAutomationCredit],
    ['automationFundingFailed', copy.automationFundingFailed],
    ['failedFundAutomation', copy.failedFundAutomation],
    ['fundingAutonomousWallet', copy.fundingAutonomousWallet],
    ['autonomousWalletFundingFailed', copy.autonomousWalletFundingFailed],
    ['failedFundAutonomousWallet', copy.failedFundAutonomousWallet],
    ['pausingIntent', copy.pausingIntent],
    ['pauseFailed', copy.pauseFailed],
    ['failedPauseIntent', copy.failedPauseIntent],
    ['pausingSwapIntent', copy.pausingSwapIntent],
    ['swapIntentPauseFailed', copy.swapIntentPauseFailed],
    ['failedPauseSwapIntent', copy.failedPauseSwapIntent],
    ['resumingIntent', copy.resumingIntent],
    ['resumeFailed', copy.resumeFailed],
    ['failedResumeIntent', copy.failedResumeIntent],
    ['resumingSwapIntent', copy.resumingSwapIntent],
    ['swapIntentResumeFailed', copy.swapIntentResumeFailed],
    ['failedResumeSwapIntent', copy.failedResumeSwapIntent],
    ['pausingReactiveListener', copy.pausingReactiveListener],
    ['reactiveListenerPauseFailed', copy.reactiveListenerPauseFailed],
    ['failedPauseReactiveListener', copy.failedPauseReactiveListener],
    ['resumingReactiveListener', copy.resumingReactiveListener],
    ['reactiveListenerResumeFailed', copy.reactiveListenerResumeFailed],
    ['failedResumeReactiveListener', copy.failedResumeReactiveListener],
    ['emittingSourceSignal', copy.emittingSourceSignal],
    ['awaitingAutomationResult', copy.awaitingAutomationResult],
    ['automationResultDetected', copy.automationResultDetected],
    ['automationStillPending', copy.automationStillPending],
    ['signalEmissionFailed', copy.signalEmissionFailed],
    ['failedEmitSourceSignal', copy.failedEmitSourceSignal],
    ['switchingExecutionEnvironment', copy.switchingExecutionEnvironment],
    ['executionEnvironmentSwitched', copy.executionEnvironmentSwitched],
    ['executionEnvironmentSwitchFailed', copy.executionEnvironmentSwitchFailed],
    ['connectedWalletMismatch', copy.connectedWalletMismatch],
    ['initializeWalletToContinue', copy.initializeWalletToContinue],
    ['walletAccessUnavailable', copy.walletAccessUnavailable],
    ['walletFactoryMissing', copy.walletFactoryMissing],
    ['walletNotInitialized', copy.walletNotInitialized],
    ['swapIntentUnsupported', copy.swapIntentUnsupported],
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
    ['swapIntentConfiguredAction', copy.swapIntentConfiguredAction],
    ['intentPausedAction', copy.intentPausedAction],
    ['intentResumedAction', copy.intentResumedAction],
    ['swapIntentPausedAction', copy.swapIntentPausedAction],
    ['swapIntentResumedAction', copy.swapIntentResumedAction],
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
  if (value === 'Autonomous Wallet Ready') return copy.autonomousWalletCreatedAction
  if (value === 'Transfer Plan Saved') return copy.intentConfiguredAction
  if (value === 'Intent Paused') return copy.intentPausedAction
  if (value === 'Intent Resumed') return copy.intentResumedAction
  if (value === 'Origin Signal') return copy.originSignal
  if (value === 'Reactive Callback' || value === 'Reactive Dispatch') return copy.reactiveCallbackLabel
  if (value === 'Wallet Runtime Bound') return copy.walletRuntimeBound
  if (value === 'Destination Execution') return copy.destinationExecution
  if (value === 'Destination Skipped') return copy.destinationSkipped
  return value
}

export function translateProofDescription(label: string, description: string, locale: Locale) {
  const copy = messages[locale]
  if (label === 'Autonomous Wallet Ready') return copy.autonomousWalletCreatedDesc
  if (label === 'Transfer Plan Saved') return copy.intentConfiguredDesc
  if (label === 'Intent Paused') return copy.intentPausedDesc
  if (label === 'Intent Resumed') return copy.intentResumedDesc
  if (label === 'Origin Signal') return copy.originSignalDesc
  if (label === 'Reactive Callback' || label === 'Reactive Dispatch') return copy.reactiveCallbackDesc
  if (label === 'Wallet Runtime Bound') return copy.walletRuntimeBoundDesc
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
