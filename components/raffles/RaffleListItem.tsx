import { useRouter } from 'next/router'

interface RaffleListItemProps {
  navToPage?: string
  onClick?: () => void
  active: boolean
  endAt: number
  title: string
  className: string
}

const RaffleListItem = (props: RaffleListItemProps) => {
  const { navToPage, onClick, active, endAt, title, className = '' } = props
  const router = useRouter()

  return (
    <div
      onClick={() => {
        if (onClick) {
          onClick()
        } else if (navToPage) {
          router.push(navToPage)
        }
      }}
      className={className}
    >
      <p className={(active ? 'text-green-400' : 'text-red-400') + ' mb-1'}>
        {active ? 'Active until:' : 'Ended at:'} {new Date(endAt).toUTCString()}
      </p>
      <p>{title}</p>
    </div>
  )
}

export default RaffleListItem
