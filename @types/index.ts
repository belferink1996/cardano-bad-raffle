import type {
  BlacklistSettingsType,
  DelegatorSettingsType,
  FungibleTokenHolder,
  HolderSettingsType,
} from '../components/TheTool/Settings/HolderSettings'

export interface Raffle {
  id: string
  active: boolean

  stakeKey: string
  isToken: boolean
  token: {
    tokenId: string
    tokenName: string
    tokenImage: string
  }
  other: {
    title: string
    description: string
    image: string
  }
  amount: number
  numOfWinners: number
  entries: {
    stakeKey: string
    points: number
  }[]
  winners: {
    stakeKey: string
    address: string
    amount: number
  }[]
  txDeposit?: string
  txsWithdrawn?: string[]
  endAt: number

  delegatorSettings: DelegatorSettingsType
  blacklistSettings: BlacklistSettingsType
  holderSettings: HolderSettingsType[]
  fungibleTokenHolders: FungibleTokenHolder[]
  usedUnits: string[]
}
