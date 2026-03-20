import type { Chain } from 'viem'

function resolveOriginChain(): Chain {
  const id = Number(import.meta.env.VITE_ORIGIN_CHAIN_ID || 84532)

  if (id === 11155111) {
    return {
      id,
      name: 'Ethereum Sepolia',
      nativeCurrency: {
        decimals: 18,
        name: 'Sepolia Ether',
        symbol: 'ETH'
      },
      rpcUrls: {
        default: {
          http: [import.meta.env.VITE_ORIGIN_RPC_URL || '']
        }
      }
    }
  }

  return {
    id,
    name: 'Base Sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH'
    },
    rpcUrls: {
      default: {
        http: [import.meta.env.VITE_ORIGIN_RPC_URL || '']
      }
    }
  }
}

export const originChain: Chain = resolveOriginChain()

export const destinationChain: Chain = {
  id: 11155111,
  name: 'Ethereum Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH'
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_DESTINATION_RPC_URL || '']
    }
  }
}

export const reactiveChain: Chain = {
  id: Number(import.meta.env.VITE_REACTIVE_CHAIN_ID || 0),
  name: 'Reactive Lasna',
  nativeCurrency: {
    decimals: 18,
    name: 'REACT',
    symbol: 'REACT'
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_REACTIVE_RPC_URL || '']
    }
  }
}
