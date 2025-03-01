import { mainnet, polygon, arbitrum, optimism, base } from "viem/chains"

export const chainConfigs = {
  1: {
    name: 'Ethereum',
    tokenAddress: '0x',
    contractAddress: '0x',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    chain: mainnet,
  },
  137: {
    name: 'Polygon',
    tokenAddress: '0x',
    contractAddress: '0x',
    rpcUrl: 'https://polygon-mainnet.infura.io/v3/',
    chain: polygon,
  },
  42161: {
    name: 'Arbitrum',
    tokenAddress: '0x',
    contractAddress: '0x',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chain: arbitrum,
  },
  10: {
    name: 'Optimism',
    tokenAddress: '0x',
    contractAddress: '0x',
    rpcUrl: 'https://mainnet.optimism.io',
    chain: optimism,
  },
  8453: {
    name: 'Base',
    tokenAddress: '0x',
    contractAddress: '0x',
    rpcUrl: 'https://base.chain',
    chain: base,
  },
}
