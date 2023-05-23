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
  amount: number
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
  endAt: number

  delegatorSettings: DelegatorSettingsType
  blacklistSettings: BlacklistSettingsType
  holderSettings: HolderSettingsType[]
  fungibleTokenHolders: FungibleTokenHolder[]
  usedUnits: string[]
}
