import { getAddress, type Address } from 'viem'

import type {
  AutomationReadiness,
  ExecutionEnvironment,
  SingleSignatureReadiness
} from '../../types/willlead'
import { reactiveChain } from '../chains'
import { formatAmount, formatOperatorHeartbeat } from './format'
import { readExecutionEnvironment } from './storage'
import type { AutomationReadinessParams, OperatorRuntime, SingleSignatureReadinessParams } from './types'
import { isConfiguredAddress, isSameAddress } from './address'

const unknownOperatorRuntime: OperatorRuntime = {
  serviceStatus: 'unknown',
  lastHeartbeat: 'Never',
  listenerBalance: 'Unavailable',
  listenerDebt: 'Unavailable',
  lastFundingResult: 'Unknown',
  mirroredIntentActive: null,
  apiUrl: null,
  walletAddress: null
}

const operatorRuntimeCache = new Map<ExecutionEnvironment, OperatorRuntime>()

async function probeOperatorHealth(apiUrl: string): Promise<{
  serviceStatus: 'online' | 'offline'
  heartbeatAt: string | null
  apiUrl: string | null
} | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 1_500)

  try {
    const response = await fetch(`${apiUrl}/health?ts=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal
    })
    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as {
      serviceStatus?: string
      heartbeatAt?: string
      apiUrl?: string
    }

    return {
      serviceStatus: payload.serviceStatus === 'online' ? 'online' : 'offline',
      heartbeatAt: payload.heartbeatAt ?? null,
      apiUrl: payload.apiUrl ?? apiUrl
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

async function hydrateCachedOperatorRuntime(
  executionEnvironment: ExecutionEnvironment,
  runtime: OperatorRuntime
): Promise<OperatorRuntime | null> {
  if (!runtime.apiUrl) return null

  const health = await probeOperatorHealth(runtime.apiUrl)
  if (!health) {
    operatorRuntimeCache.set(executionEnvironment, runtime)
    return runtime
  }

  const hydratedRuntime = {
    ...runtime,
    serviceStatus: health.serviceStatus,
    lastHeartbeat: health.heartbeatAt
      ? formatOperatorHeartbeat(health.heartbeatAt)
      : runtime.lastHeartbeat,
    apiUrl: health.apiUrl ?? runtime.apiUrl
  } satisfies OperatorRuntime

  operatorRuntimeCache.set(executionEnvironment, hydratedRuntime)
  return hydratedRuntime
}

function fallbackOperatorRuntime(
  serviceStatus: OperatorRuntime['serviceStatus']
): OperatorRuntime {
  return {
    serviceStatus,
    lastHeartbeat: 'Never',
    listenerBalance: 'Unavailable',
    listenerDebt: 'Unavailable',
    lastFundingResult: 'Unknown',
    mirroredIntentActive: null,
    apiUrl: null,
    walletAddress: null
  }
}

export async function readOperatorRuntime(): Promise<OperatorRuntime> {
  if (typeof window === 'undefined') {
    return unknownOperatorRuntime
  }

  const executionEnvironment = readExecutionEnvironment()
  const cachedRuntime = operatorRuntimeCache.get(executionEnvironment) ?? null

  try {
    const runtimeStatusFile =
      executionEnvironment === 'lasna' ? 'operator-status-lasna.json' : 'operator-status.json'
    const response = await fetch(`/runtime/${runtimeStatusFile}?ts=${Date.now()}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      const hydratedCachedRuntime = cachedRuntime
        ? await hydrateCachedOperatorRuntime(executionEnvironment, cachedRuntime)
        : null
      return hydratedCachedRuntime ?? fallbackOperatorRuntime('offline')
    }

    const payload = (await response.json()) as {
      heartbeatAt?: string
      serviceStatus?: string
      listenerBalanceWei?: string
      listenerDebtWei?: string
      lastFundingResult?: string
      mirroredIntentActive?: string
      apiUrl?: string
      walletAddress?: string
    }

    if (!payload.heartbeatAt) {
      const hydratedCachedRuntime = cachedRuntime
        ? await hydrateCachedOperatorRuntime(executionEnvironment, cachedRuntime)
        : null
      return hydratedCachedRuntime ?? fallbackOperatorRuntime('unknown')
    }

    const heartbeatDate = new Date(payload.heartbeatAt)
    let effectiveHeartbeatAt = payload.heartbeatAt
    let serviceStatus = payload.serviceStatus === 'online' ? 'online' : 'offline'
    let apiUrl = payload.apiUrl ?? null
    let fresh = Date.now() - heartbeatDate.getTime() <= 15_000

    if (!fresh && serviceStatus === 'online' && apiUrl) {
      const health = await probeOperatorHealth(apiUrl)
      if (health) {
        serviceStatus = health.serviceStatus
        apiUrl = health.apiUrl
        if (health.heartbeatAt) {
          effectiveHeartbeatAt = health.heartbeatAt
          fresh = Date.now() - new Date(health.heartbeatAt).getTime() <= 15_000
        }
      }
    }

    const runtime = {
      serviceStatus: serviceStatus === 'online' && fresh ? 'online' : 'offline',
      lastHeartbeat: formatOperatorHeartbeat(effectiveHeartbeatAt),
      listenerBalance: payload.listenerBalanceWei
        ? formatAmount(BigInt(payload.listenerBalanceWei), reactiveChain.nativeCurrency.symbol)
        : 'Unavailable',
      listenerDebt: payload.listenerDebtWei
        ? formatAmount(BigInt(payload.listenerDebtWei), reactiveChain.nativeCurrency.symbol)
        : 'Unavailable',
      lastFundingResult: payload.lastFundingResult ?? 'Unknown',
      mirroredIntentActive:
        payload.mirroredIntentActive === 'true'
          ? true
          : payload.mirroredIntentActive === 'false'
            ? false
            : null,
      apiUrl,
      walletAddress:
        payload.walletAddress && isConfiguredAddress(payload.walletAddress)
          ? getAddress(payload.walletAddress)
          : null
    } satisfies OperatorRuntime

    operatorRuntimeCache.set(executionEnvironment, runtime)
    return runtime
  } catch {
    const hydratedCachedRuntime = cachedRuntime
      ? await hydrateCachedOperatorRuntime(executionEnvironment, cachedRuntime)
      : null
    return hydratedCachedRuntime ?? fallbackOperatorRuntime('offline')
  }
}

export function scopeOperatorRuntime(
  operatorRuntime: OperatorRuntime,
  walletAddress: Address | null
): OperatorRuntime {
  if (!walletAddress) {
    return unknownOperatorRuntime
  }

  if (operatorRuntime.apiUrl) {
    return {
      ...operatorRuntime,
      mirroredIntentActive:
        operatorRuntime.walletAddress && isSameAddress(operatorRuntime.walletAddress, walletAddress)
          ? operatorRuntime.mirroredIntentActive
          : null,
      walletAddress
    }
  }

  return {
    serviceStatus: 'offline',
    lastHeartbeat: 'Never',
    listenerBalance: 'Unavailable',
    listenerDebt: 'Unavailable',
    lastFundingResult: 'Unknown',
    mirroredIntentActive: null,
    apiUrl: null,
    walletAddress
  }
}

export function computeAutomationReadiness(
  params: AutomationReadinessParams
): AutomationReadiness {
  if (params.runtimeStatus === 'paused') return 'intent_paused'
  if (params.runtimeStatus === 'exhausted') return 'intent_exhausted'
  if (params.runtimeStatus !== 'active') return 'intent_inactive'
  if (params.listenerPaused === null) return 'unavailable'
  if (params.listenerPaused) return 'listener_paused'
  if (params.subscriptionStatus !== 'armed') return 'arming_listener'
  return 'waiting_signal'
}

export function computeSingleSignatureReadiness(
  params: SingleSignatureReadinessParams
): SingleSignatureReadiness {
  if (params.automationReadiness === 'unavailable') return 'unavailable'
  if (!params.operatorRelayAvailable) return 'requires_operator'
  return 'ready'
}
