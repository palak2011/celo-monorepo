import dotenv from 'dotenv'
import { AttestationsAddress } from '../../contractkit/contracts/Attestations'
import { GoldTokenAddress } from '../../contractkit/contracts/GoldToken'
import { StableTokenAddress } from '../../contractkit/contracts/StableToken'

// Load environment variables from .env file
dotenv.config()

// TODO(kamyar): import from /packages/mobile/src/geth/currencies.ts
export const CONTRACT_SYMBOL_MAPPING: { [key: string]: string } = {
  // GOLD_CONTRACT_ADDRESS
  [(GoldTokenAddress as string).toLowerCase()]: 'Celo Gold',
  // DOLLAR_CONTRACT_ADDRESS
  [(StableTokenAddress as string).toLowerCase()]: 'Celo Dollar',
}

export const BLOCKSCOUT_API = (process.env.BLOCKSCOUT_API as string).toLowerCase()
export const FAUCET_ADDRESS = (process.env.FAUCET_ADDRESS as string).toLowerCase()
export const VERIFICATION_REWARDS_ADDRESS = (process.env
  .VERIFICATION_REWARDS_ADDRESS as string).toLowerCase()
export const ABE_ADDRESS = (AttestationsAddress as string).toLowerCase()
