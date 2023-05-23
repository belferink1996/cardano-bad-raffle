import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { firestore, storage } from '../../utils/firebase'
import Modal from '../layout/Modal'
import RaffleViewer from './RaffleViewer'
import RaffleListItem from './RaffleListItem'
import { FetchedTimestampResponse } from '../../pages/api/timestamp'
import { RAFFLES_DB_PATH } from '../../constants'
import { Raffle } from '../../@types'

interface PastRafflesProps {
  stakeKey: string
  addTranscript: (msg: string, key?: string) => void
}

const PastRaffles = (props: PastRafflesProps) => {
  const { stakeKey, addTranscript } = props

  const [loading, setLoading] = useState(false)
  const [raffles, setRaffles] = useState<Raffle[]>([])
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null)

  const getAndSetRaffles = useCallback(async () => {
    setLoading(true)

    try {
      const collection = firestore.collection(RAFFLES_DB_PATH)
      const collectionQuery = await collection.where('stakeKey', '==', stakeKey).get()

      const {
        data: { now },
      } = await axios.get<FetchedTimestampResponse>(`/api/timestamp`)

      const payload = collectionQuery.docs
        .map((doc) => {
          const data = doc.data() as Raffle

          return {
            ...data,
            active: now < data.endAt,
            id: doc.id,
          }
        })
        .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
        .sort((a, b) => (!a.active ? b.endAt - a.endAt : a.endAt - b.endAt))

      setRaffles(payload)
    } catch (error: any) {
      console.error(error)
      addTranscript('ERROR!', error.message)
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getAndSetRaffles()
  }, [getAndSetRaffles])

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

  const clickDelete = useCallback(
    async (raffleId: string) => {
      const raffle = raffles.find((raffle) => raffle.id === raffleId) as Raffle
      const mediaUrl = raffle?.other?.image

      if (mediaUrl) {
        const fileId = mediaUrl.split('?')[0].split('%2Fbad-raffle%2F')[1]
        await storage.ref(`/tools/bad-raffle/${fileId}`).delete()
      }

      const collection = firestore.collection(RAFFLES_DB_PATH)
      await collection.doc(raffleId).delete()

      setSelectedRaffle(null)
      await getAndSetRaffles()
    },
    [raffles, getAndSetRaffles]
  )

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className='flex items-start justify-center flex-wrap'>
        {raffles.length
          ? raffles.map((raffle) => (
              <RaffleListItem
                key={`raffle-${raffle.id}`}
                onClick={() => setSelectedRaffle(raffle)}
                active={raffle.active}
                endAt={raffle.endAt}
                title={`${raffle.amount.toLocaleString()}x ${
                  raffle.isToken ? raffle.token.tokenName : raffle.other.title
                }`}
                image={raffle.isToken ? raffle.token.tokenImage : raffle.other.image}
                isToken={raffle.isToken}
              />
            ))
          : 'No previous raffle... click the above ☝️ to create your first'}
      </div>

      <Modal
        title={`Raffle: ${selectedRaffle?.id}`}
        open={!!selectedRaffle}
        onClose={() => setSelectedRaffle(null)}
      >
        {selectedRaffle ? (
          <div className='w-[555px] flex flex-col'>
            <RaffleViewer
              raffle={selectedRaffle}
              callbackTimerExpired={() => {
                setSelectedRaffle((prev) => ({ ...(prev as Raffle), active: false }))
                getAndSetRaffles()
              }}
            />

            <button
              type='button'
              onClick={() => clickCopy(`${window.location.origin}/polls/${selectedRaffle.id}`)}
              className='grow m-1 mt-2 p-4 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-xl bg-green-900 hover:bg-green-700 bg-opacity-50 hover:bg-opacity-50 hover:text-gray-200 disabled:border border hover:border border-green-700 hover:border-green-700 hover:cursor-pointer'
            >
              {isCopied ? 'Copied 👍' : 'Copy Raffle URL'}
            </button>

            {selectedRaffle.active ? (
              <button
                type='button'
                onClick={() => clickDelete(selectedRaffle.id)}
                className='grow m-1 p-4 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:bg-opacity-50 disabled:border-gray-800 disabled:text-gray-700 rounded-xl bg-red-900 hover:bg-red-700 bg-opacity-50 hover:bg-opacity-50 hover:text-gray-200 disabled:border border hover:border border-red-700 hover:border-red-700 hover:cursor-pointer'
              >
                Delete Raffle
              </button>
            ) : null}
          </div>
        ) : (
          <div />
        )}
      </Modal>
    </div>
  )
}

export default PastRaffles
