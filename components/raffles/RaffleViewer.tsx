import { Fragment } from 'react'
import { useTimer } from 'react-timer-hook'
import { Raffle } from '../../@types'

interface RaffleViewerProps {
  raffle: Raffle
  callbackTimerExpired: () => void
}

const RaffleViewer = (props: RaffleViewerProps) => {
  const { raffle, callbackTimerExpired } = props

  const timer = useTimer({
    expiryTimestamp: new Date(raffle.active ? raffle.endAt : 0),
    onExpire: () => callbackTimerExpired(),
  })

  return (
    <div>
      {raffle.isToken ? (
        <div className='w-full p-4 text-sm bg-gray-900 bg-opacity-50 rounded-xl border border-gray-700'>
          <p className='w-full text-lg text-gray-200'>
            {raffle.amount.toLocaleString()}&times; Token{raffle.amount > 1 ? 's' : ''}{' '}
          </p>

          <p className='w-full text-sm'>{raffle.token.tokenName}</p>

          <img
            src={raffle.token.tokenImage}
            alt=''
            className='w-full mt-4 object-contain rounded-lg border border-gray-700'
          />
        </div>
      ) : (
        <div className='w-full p-4 text-sm bg-gray-900 bg-opacity-50 rounded-xl border border-gray-700'>
          <p className='w-full text-lg text-gray-200'>
            {raffle.amount.toLocaleString()}&times; {raffle.other.title}
          </p>

          {raffle.other.description ? (
            <p className='w-full text-sm'>
              {raffle.other.description.split('\n').map((str, idx) => (
                <Fragment key={`str-${idx}-${str}`}>
                  {str}
                  <br />
                </Fragment>
              ))}
            </p>
          ) : null}

          {raffle.other.image ? (
            <img
              src={raffle.other.image}
              alt=''
              className='w-full mt-2 object-contain rounded-lg border border-gray-700'
            />
          ) : null}
        </div>
      )}

      {raffle.active ? (
        <table className='mx-auto mt-2 text-center text-gray-400'>
          <tbody>
            <tr className='text-xl'>
              <td>{`${timer.days < 10 ? '0' : ''}${timer.days}`}</td>
              <td>:</td>
              <td>{`${timer.hours < 10 ? '0' : ''}${timer.hours}`}</td>
              <td>:</td>
              <td>{`${timer.minutes < 10 ? '0' : ''}${timer.minutes}`}</td>
              <td>:</td>
              <td>{`${timer.seconds < 10 ? '0' : ''}${timer.seconds}`}</td>
            </tr>
          </tbody>
        </table>
      ) : !raffle.active && !raffle.winners.length ? (
        <div className='mx-auto mt-2 text-center'>Pending winner{raffle.numOfWinners > 1 ? 's' : ''}...</div>
      ) : !raffle.active && raffle.winners.length ? (
        <div className='mx-auto mt-2 text-center'>
          Winner{raffle.winners.length > 1 ? 's' : ''}:
          <ul className='text-xs text-gray-200'>
            {raffle.winners.map((item, i) => (
              <li key={`winner-${i}`}>{item.stakeKey}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default RaffleViewer
