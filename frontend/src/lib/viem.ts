export const viemReadPlan = {
  walletReads: ['getIntentSummary', 'runtimeStatus', 'lastExecutionNonce', 'lastSignalHash'],
  eventReads: ['IntentExecuted', 'IntentExecutionSkipped', 'CallbackRequested']
} as const

