'use client'
import { Fragment, useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import BadApi from '../../utils/badApi'
import { firebase, firestore } from '../../utils/firebase'
import { useWallet } from '../../contexts/WalletContext'
import ConnectWallet from '../ConnectWallet'
import TranscriptsViewer from '../TranscriptsViewer'
import RaffleViewer from '../../components/raffles/RaffleViewer'
import { RAFFLES_DB_PATH } from '../../constants'
import type { Raffle } from '../../@types'
import type { BadApiRankedToken } from '../../utils/badApi'
import type { FetchedTimestampResponse } from '../../pages/api/timestamp'
import type { Transcript } from '../TranscriptsViewer'
import type { HolderSettingsType } from '../TheTool/Settings/HolderSettings'

const badApi = new BadApi()

const EnterRaffle = (props: { raffle: Raffle; isSdkWrapped?: boolean; sdkVoterStakeKey?: string }) => {
  const { raffle, isSdkWrapped, sdkVoterStakeKey } = props
  const { connected, wallet } = useWallet()

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

  const [loading, setLoading] = useState(false)
  const [raffleActive, setRaffleActive] = useState(raffle.active || false)
  const [holderEligible, setHolderEligible] = useState(false)
  const [holderPoints, setHolderPoints] = useState<{
    stakeKey: string
    points: number
    withFungible: boolean
    units: string[]
  }>({
    stakeKey: '',
    points: 0,
    withFungible: false,
    units: [],
  })

  const raffleExpired = useCallback(() => {
    setRaffleActive(false)
    addTranscript('Raffle expired (inactive)')
  }, [])

  useEffect(() => {
    if (!raffleActive) {
      raffleExpired()
    } else if (raffleActive && !isSdkWrapped) {
      addTranscript(
        'Please connect your wallet.',
        'Your wallet will be scanned to verify your eligibility & weight'
      )
    }
  }, [raffleActive, raffleExpired, isSdkWrapped])

  const processBalances = useCallback(
    async (stakeKey: string) => {
      const { blacklistSettings, delegatorSettings, holderSettings } = raffle

      if (blacklistSettings.withBlacklist) {
        // already converted to stake keys
        const isBlacklisted = blacklistSettings.identifiers.includes(stakeKey)
        if (isBlacklisted) {
          throw new Error(`You are blacklisted from this raffle ${stakeKey}`)
        }
      }

      const { poolId, tokens } = await badApi.wallet.getData(stakeKey, {
        withStakePool: delegatorSettings.mustBeDelegatingToPool,
        withTokens: true,
      })

      if (delegatorSettings.mustBeDelegatingToPool && poolId !== delegatorSettings.poolId) {
        throw new Error(`You are not delegating to the required stake pool ${delegatorSettings.poolId}`)
      }

      const eligiblePolicySettings: HolderSettingsType[] = []
      for await (const { tokenId } of tokens || []) {
        const foundSetting = holderSettings.find((s) => tokenId.indexOf(s.policyId) === 0)
        if (foundSetting && !eligiblePolicySettings.find((s) => s.policyId === foundSetting.policyId)) {
          eligiblePolicySettings.push(foundSetting)
        }
      }

      const _elibile = !!eligiblePolicySettings.length
      setHolderEligible(_elibile)

      if (!_elibile) {
        throw new Error("You don't hold any of the required Policy IDs, therefor not eligible to vote this raffle")
      }

      addTranscript(`Found ${eligiblePolicySettings.length} eligible Policy IDs`)
      addTranscript('Processing raffle points', 'This may take a moment...')

      let votePoints = 0

      const rankedAssets: Record<string, BadApiRankedToken[]> = {}
      const voteUnits: string[] = []
      const foundFungibleHolder = raffle.fungibleTokenHolders?.find((obj) => obj.stakeKey === stakeKey)
      let countedFungiblePoints = false

      for await (const setting of eligiblePolicySettings) {
        const { policyId, weight, withTraits, traitOptions, withRanks, rankOptions, hasFungibleTokens } = setting

        if (hasFungibleTokens) {
          if (foundFungibleHolder && !foundFungibleHolder.hasEntered && !countedFungiblePoints) {
            const p = foundFungibleHolder.points
            votePoints += p
            countedFungiblePoints = true
            addTranscript(
              `Added ${p} raffle points for: fungible tokens`,
              'Based-off a snapshot taken at the time of creating the raffle'
            )
          }
        } else {
          let basePoints = 0
          let rankPoints = 0
          let traitPoints = 0

          const heldTokensOfThisPolicy = tokens?.filter((token) => token.tokenId.indexOf(policyId) === 0) || []
          for await (const { tokenId, tokenAmount } of heldTokensOfThisPolicy) {
            const isUnitUsed = !!raffle?.usedUnits.find((str) => str === tokenId)

            if (!isUnitUsed) {
              basePoints += tokenAmount.display * weight
              voteUnits.push(tokenId)

              if (withRanks) {
                if (!rankedAssets[policyId] || !rankedAssets[policyId].length) {
                  const { tokens } = await badApi.policy.getData(policyId, { withRanks: true })
                  rankedAssets[policyId] = tokens
                }

                const rankedAsset = rankedAssets[policyId].find((rankedItem) => rankedItem.tokenId === tokenId)

                if (rankedAsset) {
                  rankOptions.forEach((rankSetting) => {
                    if (
                      (rankedAsset.rarityRank as number) >= rankSetting.minRange &&
                      (rankedAsset.rarityRank as number) <= rankSetting.maxRange
                    ) {
                      rankPoints += rankSetting.amount
                    }
                  })
                }
              }

              if (withTraits) {
                const { attributes } = await badApi.token.getData(tokenId)

                traitOptions.forEach((traitSetting) => {
                  if (
                    attributes[traitSetting.category] === traitSetting.trait ||
                    attributes[traitSetting.category]?.toLowerCase() === traitSetting.trait.toLowerCase() ||
                    attributes[traitSetting.category.toLowerCase()] === traitSetting.trait ||
                    attributes[traitSetting.category.toLowerCase()]?.toLowerCase() ===
                      traitSetting.trait.toLowerCase()
                  ) {
                    traitPoints += traitSetting.amount
                  }
                })
              }
            }
          }

          votePoints += basePoints
          votePoints += rankPoints
          votePoints += traitPoints

          if (basePoints) addTranscript(`Added ${basePoints} raffle points for: holding`, policyId)
          if (rankPoints) addTranscript(`Added ${rankPoints} raffle points for: ranks`, policyId)
          if (traitPoints) addTranscript(`Added ${traitPoints} raffle points for: attributes`, policyId)
        }
      }

      addTranscript(`You have ${votePoints} total raffle points`, 'Now you can enter the raffle 👇')
      setHolderPoints({
        stakeKey,
        points: votePoints,
        withFungible: countedFungiblePoints,
        units: voteUnits,
      })

      toast.dismiss()
      toast.success('Connected!')
    },
    [raffle]
  )

  const loadWallet = useCallback(async () => {
    setLoading(true)
    toast.loading('Processing...')

    try {
      const sKey = (await wallet.getRewardAddresses())[0]
      addTranscript('Connected', sKey)

      await processBalances(sKey)
    } catch (error: any) {
      console.error(error)
      const errMsg = error?.response?.data || error?.message || error?.toString() || 'UNKNOWN ERROR'

      toast.dismiss()
      toast.error('Woopsies!')
      addTranscript('Woopsies!', errMsg)
    }

    setLoading(false)
  }, [wallet, processBalances])

  const loadWalletFromSdk = useCallback(async () => {
    setLoading(true)
    toast.loading('Processing...')

    try {
      addTranscript('Connected', sdkVoterStakeKey)

      await processBalances(sdkVoterStakeKey as string)
    } catch (error: any) {
      console.error(error)
      const errMsg = error?.response?.data || error?.message || error?.toString() || 'UNKNOWN ERROR'

      toast.dismiss()
      toast.error('Woopsies!')
      addTranscript('Woopsies!', errMsg)
    }

    setLoading(false)
  }, [sdkVoterStakeKey, processBalances])

  useEffect(() => {
    if (raffleActive && !loading) {
      if (isSdkWrapped) {
        loadWalletFromSdk()
      } else if (connected) {
        loadWallet()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleActive, connected, loadWallet, isSdkWrapped, loadWalletFromSdk])

  const enterRaffle = useCallback(async () => {
    if (raffle && holderPoints.points) {
      try {
        setLoading(true)
        toast.loading('Processing...')
        addTranscript('Processing voting points', 'This may take a moment...')

        const {
          data: { now },
        } = await axios.get<FetchedTimestampResponse>(`/api/timestamp`)

        if (now >= raffle.endAt) {
          setRaffleActive(false)
          addTranscript('Raffle expired (inactive)')
          toast.dismiss()
          return
        }

        const collection = firestore.collection(RAFFLES_DB_PATH)
        const { FieldValue } = firebase.firestore

        const foundEntry = raffle.entries?.find((obj) => obj.stakeKey === holderPoints.stakeKey)

        let points = holderPoints.points

        if (foundEntry) {
          await collection.doc(raffle?.id).update({
            entries: FieldValue.arrayRemove(foundEntry),
          })

          points += foundEntry.points
        }

        const arrayUnionEntries = FieldValue.arrayUnion({
          stakeKey: holderPoints.stakeKey,
          points,
        })

        const arrayUnionUnits = FieldValue.arrayUnion(...holderPoints.units)

        await collection.doc(raffle?.id).update({
          usedUnits: arrayUnionUnits,
          entries: arrayUnionEntries,
        })

        if (holderPoints.withFungible) {
          const foundFungibleHolder = raffle.fungibleTokenHolders?.find(
            (obj) => obj.stakeKey === holderPoints.stakeKey
          )

          await collection.doc(raffle?.id).update({
            fungibleTokenHolders: FieldValue.arrayRemove(foundFungibleHolder),
          })
          await collection.doc(raffle?.id).update({
            fungibleTokenHolders: FieldValue.arrayUnion({ ...foundFungibleHolder, hasVoted: true }),
          })
        }

        addTranscript('Success! You can leave the raffle 👍', `Entered with ${holderPoints.points} points`)
        setHolderPoints({
          stakeKey: '',
          points: 0,
          withFungible: false,
          units: [],
        })

        toast.dismiss()
        toast.success('Entered!')
      } catch (error: any) {
        console.error(error)
        const errMsg = error?.response?.data || error?.message || error?.toString() || 'UNKNOWN ERROR'

        toast.dismiss()
        toast.error('Woopsies!')
        addTranscript('ERROR', errMsg)
      } finally {
        setLoading(false)
      }
    }
  }, [raffle, holderPoints])

  return (
    <div className='w-[80vw] md:w-[555px] mx-auto'>
      <TranscriptsViewer transcripts={transcripts} />

      {isSdkWrapped ? (
        <div className='mb-2' />
      ) : (
        <div className='w-full mb-4 flex flex-wrap items-center justify-evenly'>
          <ConnectWallet disabled={!raffleActive} disableTokenGate addTranscript={addTranscript} />
        </div>
      )}

      <RaffleViewer raffle={raffle} callbackTimerExpired={() => raffleExpired()} />

      {raffleActive ? (
        <Fragment>
          <div className='w-full mt-2 flex flex-wrap items-center justify-evenly'>
            <button
              type='button'
              disabled={
                (!isSdkWrapped && !connected) ||
                (isSdkWrapped && !sdkVoterStakeKey) ||
                !raffleActive ||
                !holderPoints.points ||
                loading
              }
              onClick={() => enterRaffle()}
              className='grow m-1 p-4 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-xl bg-green-900 hover:bg-green-700 bg-opacity-50 hover:bg-opacity-50 hover:text-gray-200 disabled:border border hover:border border-green-700 hover:border-green-700 hover:cursor-pointer'
            >
              Enter Raffle
            </button>
          </div>

          <div className='mt-4 flex flex-col items-center justify-center'>
            <h6>Who can enter?</h6>

            {raffle.holderSettings.map((setting) => (
              <div key={`holderSetting-${setting.policyId}`} className='text-xs my-2'>
                <p className='text-gray-200'>{setting.policyId}</p>
                <p>Policy ID ({setting.weight} points)</p>
                {setting.withRanks
                  ? setting.rankOptions.map((rankSetting) => (
                      <p key={`rankSetting-${rankSetting.minRange}-${rankSetting.maxRange}`}>
                        Ranks: {rankSetting.minRange}-{rankSetting.maxRange} ({rankSetting.amount} points)
                      </p>
                    ))
                  : null}

                {setting.withTraits
                  ? setting.traitOptions.map((traitSetting) => (
                      <p key={`traitSetting-${traitSetting.category}-${traitSetting.trait}`}>
                        Attribute: {traitSetting.category} / {traitSetting.trait} ({traitSetting.amount} points)
                      </p>
                    ))
                  : null}
              </div>
            ))}
          </div>
        </Fragment>
      ) : null}
    </div>
  )
}

export default EnterRaffle
