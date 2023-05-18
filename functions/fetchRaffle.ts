import axios from 'axios'
import { firestore } from '../utils/firebase'
import { FetchedTimestampResponse } from '../pages/api/timestamp'
import { RAFFLES_DB_PATH } from '../constants'
import { Raffle } from '../@types'

const fetchRaffle = async (_pollId: string, overrideNow?: number) => {
  if (!_pollId) {
    return null
  }

  const collection = firestore.collection(RAFFLES_DB_PATH)
  const collectionQuery = await collection.doc(_pollId).get()
  const docData = collectionQuery.data()

  if (!docData) {
    return null
  }

  let now = overrideNow
  if (!now) {
    const { data } = await axios.get<FetchedTimestampResponse>('/api/timestamp')
    now = data.now
  }

  const payload: Raffle = {
    ...(docData as Raffle),
    id: collectionQuery.id,
    active: now < docData.endAt,
  }

  return payload
}

export default fetchRaffle
