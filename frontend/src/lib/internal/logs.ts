import type { PublicClient } from 'viem'
import type { Address, Hex } from 'viem'
import { logQueryChunkSize } from '../constants'

export async function getLogsPaged(parameters: {
  client: PublicClient
  address: Address
  event: any
  args?: any
  lookbackBlocks?: bigint
  strict?: boolean
}) {
  const latestBlock = await parameters.client.getBlockNumber()
  const startBlock =
    parameters.lookbackBlocks && latestBlock > parameters.lookbackBlocks
      ? latestBlock - parameters.lookbackBlocks
      : 0n
  const logs: any[] = []

  for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += logQueryChunkSize +1n) {
    const toBlock =
      fromBlock + logQueryChunkSize > latestBlock ? latestBlock : fromBlock + logQueryChunkSize

    const chunk = await parameters.client.getLogs({
    address: parameters.address,
    event: parameters.event,
    args: parameters.args,
    fromBlock,
    toBlock,
    strict: parameters.strict
  })

    logs.push(...chunk)
  }

  return logs
}

export async function getRawLogsPaged(parameters: {
  client: PublicClient
  address: Address
  topics: [Hex, ...(Hex | null)[]]
  lookbackBlocks?: bigint
}) {
  const latestBlock = await parameters.client.getBlockNumber()
  const startBlock =
    parameters.lookbackBlocks && latestBlock > parameters.lookbackBlocks
      ? latestBlock - parameters.lookbackBlocks
      : 0n
  const logs: Array<{ data?: string }> = []

  for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += logQueryChunkSize+1n) {
    const toBlock =
      fromBlock + logQueryChunkSize > latestBlock ? latestBlock : fromBlock + logQueryChunkSize

    const chunk = await parameters.client.request({
      method: 'eth_getLogs',
      params: [
        {
          address: parameters.address,
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: parameters.topics
        }
      ]
    })

    logs.push(...(chunk as Array<{ data?: string }>))
  }

  return logs
}
