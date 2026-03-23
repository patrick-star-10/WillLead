import type { DisplayIntentKind, ExecutionEnvironment } from '../types/willlead'

export const defaultDisplayIntentKind: DisplayIntentKind = 'transfer'

const primarySwapFaucetDemoIntent = {
  kind: 'swap_faucet' as const,
  upstreamProtocol: 'Uniswap Sepolia',
  sourcePairLabel: 'Sepolia ETH / Circle USDC (verified live v3 pools: 100 / 500 / 3000 / 10000)',
  watchedPoolAddress: '0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1',
  watchedPoolAddresses: [
    '0xFeEd501c2B21D315F04946F85fC6416B640240b5',
    '0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1',
    '0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50',
    '0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47'
  ],
  watchedPoolFeeTiers: [100, 500, 3000, 10000],
  watchedPoolId: '0x4d4a3db63d272d90c95735a9ada5b249a13ddbb5af75a9264a5235ad27175ef1',
  poolManagerAddress: '0xFeEd501c2B21D315F04946F85fC6416B640240b5',
  triggerEvent: 'Swap',
  listenerAddress: '0x7374ff9C5c7B3b913d8eF301338d112595C3f156',
  executionContractAddress: '0x583563184753f51EAaE7489ec4935f77D4315f7E',
  faucetAddress: '0x9b9BB25f1A81078C544C829c5EB7822d747Cf434',
  sourceChainId: '11155111',
  destinationChainId: '11155111',
  swapTopic0: '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
  executionAction: 'wallet-funded request(address) on the Reactive faucet',
  executionFundingPerTrigger: '0.01 Sepolia ETH',
  sourceChainLabel: 'Ethereum Sepolia',
  destinationNetworkLabel: 'Reactive Lasna',
  destinationAssetLabel: 'lREACT',
  latestSourceTxHash: 'Waiting for next demo trigger',
  latestExecutionTxHash: 'Waiting for next demo execution'
}

export const swapFaucetDemoIntent = primarySwapFaucetDemoIntent

export function getSwapFaucetDemoIntent(executionEnvironment: ExecutionEnvironment) {
  return executionEnvironment === 'primary' ? primarySwapFaucetDemoIntent : null
}
