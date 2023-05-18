import type { NextPage } from 'next'
import { useMemo } from 'react'
import { firestore } from '../../utils/firebase'
import { RAFFLES_DB_PATH } from '../../constants'
import type { Raffle } from '../../@types'
import RaffleListItem from '../../components/raffles/RaffleListItem'

export const getServerSideProps = async (ctx: any) => {
  const now = Date.now()
  const collection = firestore.collection(RAFFLES_DB_PATH)
  const collectionQuery = await collection
    // .where('endAt', '>', now)
    .get()

  const raffles = collectionQuery.docs
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

  return { props: { raffles } }
}

const Page: NextPage = (props: { raffles?: Raffle[] }) => {
  const raffles = useMemo(() => props.raffles || [], [props.raffles])

  return (
    <div className='flex flex-col items-center'>
      {!raffles.length
        ? 'No raffles...'
        : raffles.map((raffle) => (
            <RaffleListItem
              key={`raffle-${raffle.id}`}
              navToPage={`/raffles/${raffle.id}`}
              active={raffle.active}
              endAt={raffle.endAt}
              title={raffle.isToken ? raffle.token.tokenName : raffle.title}
              className='m-1 p-4 text-sm bg-gray-900 bg-opacity-50 hover:bg-opacity-50 rounded-xl border border-gray-700 select-none cursor-pointer hover:bg-gray-700 hover:text-gray-200 hover:border hover:border-gray-500'
            />
          ))}
    </div>
  )
}

export default Page
