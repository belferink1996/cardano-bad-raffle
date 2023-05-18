import { Fragment, useEffect, useState } from 'react'
import { ChevronDownIcon, CursorArrowRaysIcon } from '@heroicons/react/24/solid'
import { MINUTES, DAYS, HOURS, MONTHS, WEEKS } from '../../../constants'
import Modal from '../../layout/Modal'
import TokenExplorer, { HeldToken } from '../../TokenExplorer'
import { formatTokenFromChainToHuman, formatTokenFromHumanToChain } from '../../../functions/formatTokenAmount'

export type EndAtPeriod = typeof MINUTES | typeof HOURS | typeof DAYS | typeof WEEKS | typeof MONTHS

export interface RaffleSettingsType {
  isToken: boolean
  token: {
    tokenId: string
    tokenName: string
    tokenImage: string
  }
  title: string
  description: string
  amount: number
  endAt: {
    amount: number
    period: EndAtPeriod
  }
}

interface RaffleSettingsProps {
  disabled: boolean
  defaultSettings?: RaffleSettingsType
  callback: (_payload: RaffleSettingsType) => void
}

export const INIT_RAFFLE_SETTINGS: RaffleSettingsType = {
  isToken: true,
  token: {
    tokenId: '',
    tokenName: '',
    tokenImage: '',
  },
  title: '',
  description: '',
  amount: 0,
  endAt: {
    amount: 0,
    period: HOURS,
  },
}

const RaffleSettings = (props: RaffleSettingsProps) => {
  const { disabled, defaultSettings, callback } = props

  const [raffleSettings, setRaffleSettings] = useState<RaffleSettingsType>(defaultSettings || INIT_RAFFLE_SETTINGS)
  const [openPeriodSelection, setOpenPeriodSelection] = useState(false)
  const [openTokenSelection, setOpenTokenSelection] = useState(false)
  const [selectedToken, setSelectedToken] = useState<HeldToken | null>(null)
  const decimals = selectedToken?.t.tokenAmount.decimals || 0

  useEffect(() => {
    callback(raffleSettings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleSettings])

  return (
    <div className='w-full mb-4'>
      <h3 className={'mb-2 text-lg ' + (disabled ? 'text-gray-700' : '')}>Step 1 - Raffle configuration</h3>

      <div className='flex items-center'>
        <label
          className={
            'mx-2 flex items-center ' +
            (disabled ? 'text-gray-700 cursor-not-allowed' : 'hover:text-white cursor-pointer')
          }
        >
          <input
            type='radio'
            name='isToken'
            disabled={disabled}
            checked={raffleSettings['isToken']}
            onChange={(e) => {
              setRaffleSettings((prev) => {
                const obj = { ...prev }
                obj.isToken = true

                return obj
              })
            }}
            className='disabled:opacity-50'
          />
          <span className='ml-1 text-sm'>Token (NFT / FT)</span>
        </label>

        <label
          className={
            'mx-2 flex items-center ' +
            (disabled ? 'text-gray-700 cursor-not-allowed' : 'hover:text-white cursor-pointer')
          }
        >
          <input
            type='radio'
            name='isToken'
            disabled={disabled}
            checked={!raffleSettings['isToken']}
            onChange={(e) =>
              setRaffleSettings((prev) => {
                const obj = { ...prev }
                obj.isToken = false

                return obj
              })
            }
            className='disabled:opacity-50'
          />
          <span className='ml-1 text-sm'>Other (ex. Whitelist)</span>
        </label>
      </div>

      {raffleSettings['isToken'] ? (
        <Fragment>
          <div className='flex'>
            <input
              placeholder='Amount'
              disabled={disabled}
              value={formatTokenFromChainToHuman(raffleSettings.amount, decimals) || ''}
              onChange={(e) =>
                setRaffleSettings((prev) => {
                  const payload = { ...prev }
                  const v = Number(e.target.value)

                  if (isNaN(v) || v < 0) {
                    return payload
                  }

                  const ownedAmount = formatTokenFromHumanToChain(selectedToken?.o || 0, decimals)
                  const selectedAmount = formatTokenFromHumanToChain(v, decimals)

                  if (selectedAmount > ownedAmount) {
                    payload.amount = ownedAmount
                  } else {
                    payload.amount = selectedAmount
                  }

                  return payload
                })
              }
              className='w-[30%] mr-1 my-0.5 p-3 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 disabled:placeholder:text-gray-700 rounded-lg bg-gray-900 border border-gray-700 text-sm hover:bg-gray-700 hover:border-gray-500 hover:text-white hover:placeholder:text-white'
            />
            <button
              type='button'
              disabled={disabled}
              onClick={() => setOpenTokenSelection((prev) => !prev)}
              className='w-full my-0.5 p-3 flex items-center justify-center disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-lg bg-gray-900 hover:bg-gray-700 text-sm hover:text-white border border-gray-700 hover:border-gray-500'
            >
              <CursorArrowRaysIcon className='w-6 h-6 mr-2' />
              Select Token
            </button>
          </div>

          {selectedToken ? (
            <img
              src={selectedToken.t.image.url}
              alt=''
              className='w-full object-contain rounded-lg border border-gray-700'
            />
          ) : null}
        </Fragment>
      ) : (
        <Fragment>
          <div className='flex'>
            <input
              placeholder='Amount'
              disabled={disabled}
              value={raffleSettings.amount || ''}
              onChange={(e) =>
                setRaffleSettings((prev) => {
                  const payload = { ...prev }
                  const v = Number(e.target.value)

                  if (isNaN(v) || v < 0) {
                    return prev
                  }

                  payload.amount = v
                  return payload
                })
              }
              className='w-[30%] mr-1 my-0.5 p-3 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 disabled:placeholder:text-gray-700 rounded-lg bg-gray-900 border border-gray-700 text-sm hover:bg-gray-700 hover:border-gray-500 hover:text-white hover:placeholder:text-white'
            />
            <input
              placeholder='Title'
              disabled={disabled}
              value={raffleSettings.title}
              onChange={(e) =>
                setRaffleSettings((prev) => {
                  const payload = { ...prev }

                  payload.title = e.target.value

                  return payload
                })
              }
              className='w-full my-0.5 p-3 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 disabled:placeholder:text-gray-700 rounded-lg bg-gray-900 border border-gray-700 text-sm hover:bg-gray-700 hover:border-gray-500 hover:text-white hover:placeholder:text-white'
            />
          </div>

          <textarea
            placeholder='Description (optional)'
            disabled={disabled}
            value={raffleSettings.description}
            onChange={(e) =>
              setRaffleSettings((prev) => {
                const payload = { ...prev }

                payload.description = e.target.value

                return payload
              })
            }
            className='w-full my-0.5 p-3 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 disabled:placeholder:text-gray-700 rounded-lg bg-gray-900 border border-gray-700 text-sm hover:bg-gray-700 hover:border-gray-500 hover:text-white hover:placeholder:text-white'
          />
        </Fragment>
      )}

      <div className={(disabled ? 'bg-gray-800 ' : 'bg-gray-400 ') + 'w-3/4 h-0.5 my-4 mx-auto rounded-full'} />

      <h6 className={'text-sm ' + (disabled ? 'text-gray-700' : '')}>When should the raffle end?</h6>

      <div className='flex my-0.5'>
        <label className='w-[30%] mr-1'>
          <input
            placeholder='0'
            disabled={disabled}
            value={raffleSettings.endAt.amount || ''}
            onChange={(e) =>
              setRaffleSettings((prev) => {
                const v = Number(e.target.value)

                if (isNaN(v) || v < 0) {
                  return prev
                }

                return {
                  ...prev,
                  endAt: {
                    ...prev.endAt,
                    amount: v,
                  },
                }
              })
            }
            className='w-full p-3 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 disabled:placeholder:text-gray-700 placeholder:text-gray-600 rounded-lg bg-gray-900 border border-gray-700 text-sm hover:bg-gray-700 hover:border-gray-500 hover:text-white hover:placeholder:text-white'
          />
        </label>

        <div className='w-full relative'>
          <button
            type='button'
            disabled={disabled}
            onClick={() => setOpenPeriodSelection((prev) => !prev)}
            className='w-full p-3 flex items-center justify-between disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-lg bg-gray-900 hover:bg-gray-700 text-sm hover:text-white border border-gray-700 hover:border-gray-500'
          >
            <span>
              {!!raffleSettings.endAt.period ? `Period: ${raffleSettings.endAt.period}` : 'Select a Period'}
            </span>
            <ChevronDownIcon className={(openPeriodSelection ? 'rotate-180' : 'rotate-0') + ' ml-1 w-4 h-4'} />
          </button>

          <div
            className={
              (openPeriodSelection ? 'flex ' : 'hidden ') +
              (disabled ? 'bg-gray-900 bg-opacity-50 border-gray-800 text-gray-700' : '') +
              ' flex-col max-h-56 overflow-y-auto absolute top-14 z-20 w-full p-3 rounded-lg bg-gray-900 border border-gray-700'
            }
          >
            {[MINUTES, HOURS, DAYS, WEEKS, MONTHS].map((val) => (
              <button
                key={`period-${val}`}
                type='button'
                disabled={disabled}
                onClick={() => {
                  setRaffleSettings((prev) => {
                    return {
                      ...prev,
                      endAt: {
                        ...prev.endAt,
                        period: val as EndAtPeriod,
                      },
                    }
                  })
                  setOpenPeriodSelection(false)
                }}
                className={
                  'w-full py-1 rounded-xl truncate text-sm text-start ' +
                  (disabled ? '' : 'hover:text-white ') +
                  (!disabled && raffleSettings.endAt.period === val ? 'text-white' : '')
                }
              >
                <span>{val}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal open={openTokenSelection} onClose={() => setOpenTokenSelection(false)}>
        {openTokenSelection ? (
          <TokenExplorer
            callback={(payload) => {
              setSelectedToken(payload)
              setRaffleSettings((prev) => ({
                ...prev,
                amount: 0,
                token: {
                  tokenId: payload.t.tokenId,
                  tokenImage: payload.t.image.url,
                  tokenName:
                    payload.t.tokenName?.ticker ||
                    payload.t.tokenName?.display ||
                    payload.t.tokenName?.onChain ||
                    '',
                },
              }))
              setOpenTokenSelection(false)
            }}
          />
        ) : (
          <div />
        )}
      </Modal>
    </div>
  )
}

export default RaffleSettings
