import { useEffect, useState } from 'react'
import RaffleSettings, { RaffleSettingsType } from './RaffleSettings'
import HolderSettings, { BlacklistSettingsType, DelegatorSettingsType, HolderSettingsType } from './HolderSettings'

export interface SettingsType {
  raffleSettings: RaffleSettingsType
  delegatorSettings: DelegatorSettingsType
  blacklistSettings: BlacklistSettingsType
  holderSettings: HolderSettingsType[]
}

interface SettingsProps {
  disabled: boolean
  defaultSettings?: SettingsType
  callback: (_payload: SettingsType) => void
}

const Settings = (props: SettingsProps) => {
  const { disabled, defaultSettings, callback } = props

  const [raffleSettings, setRaffleSettings] = useState<RaffleSettingsType | undefined>(
    defaultSettings?.raffleSettings || undefined
  )
  const [delegatorSettings, setDelegatorSettings] = useState<DelegatorSettingsType | undefined>(
    defaultSettings?.delegatorSettings || undefined
  )
  const [blacklistSettings, setBlacklistSettings] = useState<BlacklistSettingsType | undefined>(
    defaultSettings?.blacklistSettings || undefined
  )
  const [holderSettings, setHolderSettings] = useState<HolderSettingsType[] | undefined>(
    defaultSettings?.holderSettings || undefined
  )

  useEffect(() => {
    if (raffleSettings && delegatorSettings && blacklistSettings && holderSettings) {
      callback({
        raffleSettings,
        delegatorSettings,
        blacklistSettings,
        holderSettings,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleSettings, delegatorSettings, blacklistSettings, holderSettings])

  return (
    <div className='w-full px-1 flex flex-col items-center md:flex-row md:items-start md:justify-between'>
      <div className='max-w-[500px] w-full md:mr-2'>
        <RaffleSettings
          disabled={disabled}
          defaultSettings={raffleSettings}
          callback={(payload) => setRaffleSettings(payload)}
        />
      </div>

      <div className='max-w-[500px] w-full md:ml-2 mt-4 md:mt-0'>
        <HolderSettings
          disabled={disabled}
          defaultDelegatorSettings={delegatorSettings}
          defaultBlacklistSettings={blacklistSettings}
          defaultHolderSettings={holderSettings}
          callback={(payload) => {
            setDelegatorSettings(payload.delegatorSettings)
            setBlacklistSettings(payload.blacklistSettings)
            setHolderSettings(payload.holderSettings)
          }}
        />
      </div>
    </div>
  )
}

export default Settings
