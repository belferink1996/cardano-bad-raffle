import { Fragment, useEffect, useState } from 'react'
import { useTimer } from 'react-timer-hook'
import { Raffle } from '../../@types'

interface RaffleViewerProps {
  raffle: Raffle
  callbackTimerExpired: () => void
}

interface Pointallocation {
  totalPoints: number
  winnerSerialNumber: number
  allocation: {
    [key: string]: {
      points: number
      percent: number
    }
  }
}

const RaffleViewer = (props: RaffleViewerProps) => {
  const { raffle, callbackTimerExpired } = props
  const [pointAllocation, setPointAllocation] = useState<Pointallocation>({
    totalPoints: 0,
    winnerSerialNumber: 0,
    allocation: {},
  })

  useEffect(() => {
    const most = { points: 0, serial: 0 }
    const payload: Pointallocation = { totalPoints: 0, winnerSerialNumber: 0, allocation: {} }

    // raffle.options.forEach((obj) => {
    //   const key = `vote_${obj.serial}`
    //   const points = raffle[key] || 0

    //   if (points > most.points) {
    //     most.points = points
    //     most.serial = obj.serial
    //   }

    //   if (!payload.allocation[key]) {
    //     payload.allocation[key] = { points: 0, percent: 0 }
    //   }

    //   payload.allocation[key].points = points
    //   payload['totalPoints'] += points
    // })

    Object.entries(payload.allocation).forEach(([key, obj]) => {
      payload.allocation[key].percent = Math.round((100 / payload['totalPoints']) * obj.points)
    })
    payload['winnerSerialNumber'] = most.serial

    setPointAllocation(payload)
  }, [raffle])

  const timer = useTimer({
    expiryTimestamp: new Date(raffle.active ? raffle.endAt : 0),
    onExpire: () => callbackTimerExpired(),
  })

  return (
    <div>
      {raffle.isToken ? (
        <div className='w-full py-2 px-4 text-sm bg-gray-900 bg-opacity-50 rounded-xl border border-gray-700'>
          <p className='w-full mt-2 text-lg text-gray-200'>
            {raffle.amount.toLocaleString()}&times; Token{raffle.amount > 1 ? 's' : ''}{' '}
          </p>

          <p className='w-full mb-4 text-sm'>{raffle.token.tokenName}</p>

          <img
            src={raffle.token.tokenImage}
            alt=''
            className='w-full object-contain rounded-lg border border-gray-700'
          />
        </div>
      ) : (
        <div className='w-full py-2 px-4 text-sm bg-gray-900 bg-opacity-50 rounded-xl border border-gray-700'>
          <p className='w-full mt-2 text-lg text-gray-200'>
            {raffle.amount.toLocaleString()}&times; {raffle.other.title}
          </p>

          {raffle.other.description ? (
            <p className='w-full mb-4 text-sm'>
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
              className='w-full object-contain rounded-lg border border-gray-700'
            />
          ) : null}
        </div>
      )}

      <table className={'mx-auto mt-2 text-center ' + (raffle.active ? 'text-gray-400' : 'text-gray-700')}>
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
    </div>
  )
}

export default RaffleViewer
