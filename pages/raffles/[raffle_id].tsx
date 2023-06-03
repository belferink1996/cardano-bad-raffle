import dynamic from 'next/dynamic'
import type { NextPage } from 'next'
import fetchRaffle from '../../functions/fetchRaffle'
import { Raffle } from '../../@types'

const EnterRaffle = dynamic(async () => (await import('../../components/raffles/EnterRaffle')).default, {
  ssr: false,
})

export const getServerSideProps = async (ctx: any) => {
  const raffle = await fetchRaffle(ctx.query.raffle_id, Date.now())

  const isOk = !raffle?.isToken || (raffle?.isToken && !!raffle?.txDeposit)

  return { props: { raffle: isOk ? raffle : null } }
}

const Page: NextPage = (props: { raffle?: Raffle | null }) => {
  const { raffle } = props

  if (!raffle) {
    return <div className='flex items-center justify-center'>Raffle does not exist...</div>
  }

  return <EnterRaffle raffle={raffle} />
}

export default Page
