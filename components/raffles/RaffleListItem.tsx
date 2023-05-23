import { useRouter } from 'next/router'

interface RaffleListItemProps {
  navToPage?: string
  onClick?: () => void
  active: boolean
  endAt: number
  title: string
  image?: string
  isToken: boolean
}

const RaffleListItem = (props: RaffleListItemProps) => {
  const { navToPage, onClick, active, endAt, title, image, isToken } = props
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
      className={
        'm-1 p-4 text-sm bg-opacity-50 hover:bg-opacity-50 rounded-xl border hover:border select-none cursor-pointer ' +
        (isToken ? 'bg-blue-900 border-blue-700 hover:bg-blue-700 text-blue-400 hover:text-blue-200 hover:border-blue-500' : 'bg-gray-900 border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500')
      }
    >
      <p className={(active ? 'text-green-400' : 'text-red-400') + ' mb-1'}>
        {active ? 'Active until:' : 'Ended at:'} {new Date(endAt).toUTCString()}
      </p>

      <p>{title}</p>

      {image ? (
        <img
          src={image}
          alt=''
          className='w-[250px] sm:w-[350px] mt-2 object-contain rounded-lg border border-gray-700'
        />
      ) : null}
    </div>
  )
}

export default RaffleListItem
