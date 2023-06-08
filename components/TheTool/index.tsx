import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import BadApi from '../../utils/badApi'
import { firestore } from '../../utils/firebase'
import { useWallet } from '../../contexts/WalletContext'
import { formatTokenFromChainToHuman } from '../../functions/formatTokenAmount'
import ConnectWallet from '../ConnectWallet'
import Settings from './Settings'
import TranscriptsViewer from '../TranscriptsViewer'
import PastRaffles from '../raffles/PastRaffles'
import { APP_WALLET_ADDRESS, RAFFLES_DB_PATH } from '../../constants'
import type { BadApiBaseToken, BadApiTokenOwners } from '../../utils/badApi'
import type { FetchedTimestampResponse } from '../../pages/api/timestamp'
import type { Transcript } from '../TranscriptsViewer'
import type { SettingsType } from './Settings'
import type { FungibleTokenHolder } from './Settings/HolderSettings'
import { Transaction } from '@meshsdk/core'

const badApi = new BadApi()

const TheTool = () => {
  const { connected, hasNoKey, wallet } = useWallet()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])

  const addTranscript = (msg: string, key?: string) => {
    setTranscripts((prev) => {
      const prevCopy = [...prev]
      if (prevCopy.length >= 50) prevCopy.pop()

      return [
        {
          timestamp: new Date().getTime(),
          msg,
          key,
        },
        ...prevCopy,
      ]
    })
  }

  useEffect(() => {
    addTranscript('Welcome, please connect your wallet.', 'You have to hold a Bad Key 🔑 to access the tool 🔒')
  }, [])

  const [connectedStakeKey, setConnectedStakeKey] = useState('')
  const [settings, setSettings] = useState<SettingsType | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [showPastRaffles, setShowPastRaffles] = useState(false)
  const [rafflePublished, setRafflePublished] = useState(false)
  const [raffleUrl, setRaffleUrl] = useState('')

  const isUserSettingsExist = useCallback(
    () =>
      !!(
        settings &&
        settings.delegatorSettings &&
        ((settings.delegatorSettings.mustBeDelegatingToPool && settings.delegatorSettings.poolId) ||
          !settings.delegatorSettings.mustBeDelegatingToPool) &&
        settings.holderSettings &&
        settings.holderSettings.length &&
        settings.raffleSettings &&
        ((settings.raffleSettings.isToken && settings.raffleSettings.token.tokenId) ||
          (!settings.raffleSettings.isToken && settings.raffleSettings.other.title)) &&
        settings.raffleSettings.amount &&
        settings.raffleSettings.numOfWinners &&
        settings.raffleSettings.endAt.amount &&
        settings.raffleSettings.endAt.period
      ),
    [settings]
  )

  const loadWallet = useCallback(async () => {
    if (connected) {
      setLoading(true)
      toast.loading('Processing...')

      if (hasNoKey) {
        toast.dismiss()
        toast.error('Woopsies!')
        setLoading(true)
        return addTranscript("Wallet doesn't have a Bad Key 🔐", 'https://jpg.store/collection/badkey')
      }

      try {
        const sKey = (await wallet.getRewardAddresses())[0]
        addTranscript('Connected', sKey)
        setConnectedStakeKey(sKey)

        addTranscript(
          'Define your raffle settings',
          "Once the raffle's published, the settings cannot be altered/changed."
        )
        toast.dismiss()
        toast.success('Connected!')
      } catch (error: any) {
        console.error(error)
        toast.dismiss()
        toast.error('Woopsies!')
        addTranscript('ERROR', error.message)
      }
    }

    setLoading(false)
  }, [wallet, connected, hasNoKey])

  useEffect(() => {
    if (!loading) loadWallet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWallet])

  const clickPublish = useCallback(async () => {
    if (!settings) return

    setLoading(true)
    toast.loading('Processing...')

    try {
      const delegatorSettings = settings.delegatorSettings
      const blacklistSettings = settings.blacklistSettings
      const holderSettings = settings.holderSettings || []
      const fungibleTokens: (BadApiBaseToken & { policyId: string })[] = []

      if (delegatorSettings.mustBeDelegatingToPool) {
        // will throw if not found
        await badApi.stakePool.getData(delegatorSettings.poolId)
      }

      if (blacklistSettings.withBlacklist) {
        addTranscript('Processing blacklisted wallets', 'This may take a moment...')

        const blacklistedWallets: string[] = []
        for await (const walletId of blacklistSettings.identifiers) {
          // will throw if not found
          const { stakeKey } = await badApi.wallet.getData(walletId)
          blacklistedWallets.push(stakeKey)
        }

        blacklistSettings.identifiers = blacklistedWallets
      }

      for (let pIdx = 0; pIdx < holderSettings.length; pIdx++) {
        const { policyId, withRanks } = holderSettings[pIdx]
        addTranscript(`Verifying settings for Policy ID ${pIdx + 1} / ${holderSettings.length}`, policyId)

        const { tokens } = await badApi.policy.getData(policyId, { withRanks })
        for (const token of tokens) {
          if (token.isFungible) {
            holderSettings[pIdx].hasFungibleTokens = true
            fungibleTokens.push({ ...token, policyId })
          }
        }
      }

      addTranscript(
        `Verification complete`,
        'NOTE: Verification does not check attributes. They are checked when the holder connects their wallet.'
      )

      const fungibleTokenHolders: FungibleTokenHolder[] = []

      if (fungibleTokens.length) {
        if (
          window.confirm(
            'Detected Policy ID(s) with Fungible BadApiBaseToken(s).\n\nFungible Tokens cannot be "scanned" when the holder connects, because they are not "unique" assets.\n\nThe solution would be running a snapshot. Do you want to run a snapshot now?\n\nBy clicking "cancel", the raffle will not be published, allowing you to make changes.'
          )
        ) {
          const holders: {
            stakeKey: string
            assets: {
              [policyId: string]: {
                assetId: string
                amount: number
              }[]
            }
          }[] = []

          for (let tIdx = 0; tIdx < fungibleTokens.length; tIdx++) {
            const { policyId, tokenId, tokenAmount } = fungibleTokens[tIdx]
            addTranscript(`Processing token ${tIdx + 1} / ${fungibleTokens.length}`, tokenId)

            const tokenOwners: BadApiTokenOwners['owners'] = []

            for (let page = 1; true; page++) {
              addTranscript(`Fetching token holders, batch ${page}`, tokenId)
              const fetched = await badApi.token.getOwners(tokenId, { page })

              if (!fetched.owners.length) break
              tokenOwners.push(...fetched.owners)
              if (fetched.owners.length < 100) break
            }

            addTranscript(`Found ${tokenOwners.length} token holder(s)`, tokenId)

            for (const owner of tokenOwners) {
              const { quantity, stakeKey, addresses } = owner
              const { address, isScript } = addresses[0]

              if (address.indexOf('addr1') !== 0) {
                addTranscript('Address is not on Cardano', address)
              } else if (isScript) {
                addTranscript('Address is a Script or Contract', address)
              } else if (!stakeKey) {
                addTranscript('Address has no registered Stake Key', address)
              } else {
                const foundIndex = holders.findIndex((item) => item.stakeKey === stakeKey)

                const holderAsset = {
                  assetId: tokenId,
                  amount: formatTokenFromChainToHuman(quantity, tokenAmount.decimals),
                }

                if (foundIndex === -1) {
                  holders.push({
                    stakeKey,
                    assets: {
                      [policyId]: [holderAsset],
                    },
                  })
                } else if (Array.isArray(holders[foundIndex].assets[policyId])) {
                  holders[foundIndex].assets[policyId].push(holderAsset)
                } else {
                  holders[foundIndex].assets[policyId] = [holderAsset]
                }
              }
            }
          }

          fungibleTokenHolders.push(
            ...holders
              .map(({ stakeKey, assets }) => {
                let points = 0

                Object.entries(assets).forEach(([heldPolicyId, heldPolicyAssets]) => {
                  const policySetting = holderSettings.find((item) => item.policyId === heldPolicyId)
                  const policyWeight = policySetting?.weight || 0

                  for (const { amount } of heldPolicyAssets) {
                    points += amount * policyWeight
                  }
                })

                points = Math.floor(points)

                return {
                  stakeKey,
                  points,
                  hasEntered: false,
                }
              })
              .sort((a, b) => b.points - a.points)
          )
          addTranscript('Snapshot complete', 'NOTE: Fungtible tokens do not include attribute / rarity weights')
        } else {
          setLoading(false)
          toast.dismiss()
          return
        }
      }

      const {
        data: { now, endAt },
      } = await axios.get<FetchedTimestampResponse>(
        `/api/timestamp?endPeriod=${settings?.raffleSettings.endAt.period}&endAmount=${settings?.raffleSettings.endAt.amount}`
      )

      addTranscript('Publishing raffle', 'This may take a moment...')

      const collection = firestore.collection(RAFFLES_DB_PATH)

      let docId = ''
      const payload = {
        active: now < endAt,
        stakeKey: connectedStakeKey,

        ...settings.raffleSettings,
        endAt,

        delegatorSettings,
        blacklistSettings,
        holderSettings,
        fungibleTokenHolders,
        usedUnits: [],
        entries: [],
        winners: [],
      }

      if (settings.raffleSettings.isToken) {
        const lovelaces = settings.raffleSettings.numOfWinners * 1.2 * 1000000

        const tx = new Transaction({ initiator: wallet })

        tx.sendLovelace({ address: APP_WALLET_ADDRESS }, lovelaces.toString()).sendAssets(
          { address: APP_WALLET_ADDRESS },
          [
            {
              unit: settings.raffleSettings.token.tokenId,
              quantity: settings.raffleSettings.amount.toString(),
            },
          ]
        )

        addTranscript('Building TX...')
        const unsigned = await tx.build()

        addTranscript('Awaiting signature...')
        const signed = await wallet.signTx(unsigned)

        addTranscript('Submitting TX...')
        const txHash = await wallet.submitTx(signed)

        const { id } = await collection.add({
          ...payload,
          txDeposit: txHash,
          txsWithdrawn: [],
        })

        docId = id
      } else {
        const { id } = await collection.add(payload)

        docId = id
      }

      const url = `${window.location.origin}/raffles/${docId}`

      addTranscript('Published! Share this link with your community:', url)
      setRaffleUrl(url)
      setRafflePublished(true)
      toast.dismiss()
      toast.success('Published!')
    } catch (error: any) {
      console.error(error)
      const errMsg = error?.response?.data || error?.message || error?.toString() || 'UNKNOWN ERROR'

      toast.dismiss()
      toast.error('Woopsies!')

      if (errMsg.indexOf('Not enough ADA leftover to include non-ADA assets in a change address') !== -1) {
        addTranscript(
          'ERROR',
          'TX build failed: your UTXOs are clogged, please send all your ADA to yourself, together with the selected tokens.'
        )
      } else if (error?.message?.indexOf('UTxO Balance Insufficient') !== -1) {
        addTranscript(
          'ERROR',
          'TX build failed: not enough ADA to process TX, please add ADA to your wallet, then try again.'
        )
      } else {
        addTranscript('ERROR', errMsg)
      }
    }

    setLoading(false)
  }, [wallet, connectedStakeKey, settings])

  const [isCopied, setIsCopied] = useState(false)

  const clickCopy = useCallback(
    (val: string) => {
      if (!isCopied) {
        setIsCopied(true)
        navigator.clipboard.writeText(val)
        setTimeout(() => {
          setIsCopied(false)
        }, 1000)
      }
    },
    [isCopied]
  )

  return (
    <div className='flex flex-col items-center max-w-[1200px] w-full mx-auto px-10'>
      <TranscriptsViewer transcripts={transcripts} />

      <div className='w-full my-4'>
        <div className='flex flex-wrap items-center justify-evenly'>
          <ConnectWallet addTranscript={addTranscript} />

          <button
            type='button'
            disabled={!connected || hasNoKey || !isUserSettingsExist() || rafflePublished || loading}
            onClick={clickPublish}
            className='grow m-1 p-4 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-xl bg-green-900 hover:bg-green-700 bg-opacity-50 hover:bg-opacity-50 hover:text-gray-200 disabled:border border hover:border border-green-700 hover:border-green-700 hover:cursor-pointer'
          >
            Publish Raffle
          </button>

          <button
            type='button'
            disabled={!connected || hasNoKey || !rafflePublished || loading}
            onClick={() => clickCopy(raffleUrl)}
            className='grow m-1 p-4 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-xl bg-green-900 hover:bg-green-700 bg-opacity-50 hover:bg-opacity-50 hover:text-gray-200 disabled:border border hover:border border-green-700 hover:border-green-700 hover:cursor-pointer'
          >
            {isCopied ? 'Copied 👍' : 'Copy Raffle URL'}
          </button>
        </div>

        <div className='flex'>
          <button
            type='button'
            disabled={!connected || hasNoKey || loading}
            onClick={() => setShowPastRaffles((prev) => !prev)}
            className='grow m-1 p-4 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-xl bg-gray-900 hover:bg-gray-700 hover:text-gray-200 disabled:border border hover:border border-gray-700 hover:border-gray-500 hover:cursor-pointer'
          >
            {showPastRaffles ? 'Setup New Raffle' : 'Inspect Previous Raffles'}
          </button>
        </div>
      </div>

      {showPastRaffles ? (
        <PastRaffles stakeKey={connectedStakeKey} addTranscript={addTranscript} />
      ) : (
        <Settings
          disabled={!connected || hasNoKey || rafflePublished || loading}
          defaultSettings={settings}
          callback={(payload) => setSettings(payload)}
        />
      )}
    </div>
  )
}

export default TheTool
