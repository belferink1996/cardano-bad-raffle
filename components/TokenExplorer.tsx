import { useCallback, useEffect, useState } from 'react'
import BadApi, { BadApiPopulatedToken } from '../utils/badApi'
import { useWallet } from '../contexts/WalletContext'
import { formatTokenFromChainToHuman } from '../functions/formatTokenAmount'

export type HeldToken = {
  t: BadApiPopulatedToken
  o: number
}

type Collection = {
  policyId: string
  tokens: HeldToken[]
}[]

interface TokenExplorerProps {
  callback: (_payload: HeldToken) => void
}

const TokenExplorer = (props: TokenExplorerProps) => {
  const { callback } = props
  const { connected, wallet } = useWallet()

  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection>([])

  const getCollections = useCallback(async () => {
    if (!wallet || !connected || loading) return
    setLoading(true)

    try {
      const pIds = await wallet.getPolicyIds()
      const balances = await wallet.getBalance()
      const badApi = new BadApi()

      const payload = await Promise.all(
        pIds.map(async (pId) => ({
          policyId: pId,
          tokens: await Promise.all(
            balances
              ?.filter((t) => t.unit.indexOf(pId) === 0)
              ?.map(async (t) => {
                const token = await badApi.token.getData(t.unit)

                return {
                  t: token,
                  o: formatTokenFromChainToHuman(t.quantity, token.tokenAmount.decimals),
                }
              }) || []
          ),
        }))
      )

      setCollections(payload)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [wallet, connected])

  useEffect(() => {
    if (!collections.length) getCollections()
  }, [collections, getCollections])

  const [search, setSearch] = useState('')

  return (
    <div className='flex flex-col items-center'>
      {collections.length ? (
        <input
          placeholder='Search:'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-[220px] my-2 p-3 text-gray-200 placeholder:text-gray-200 bg-gray-700 rounded-lg border border-gray-500 hover:text-white hover:placeholder:text-white hover:bg-gray-500 hover:border-gray-300'
        />
      ) : null}

      <div className='flex flex-wrap items-start justify-center text-center'>
        {!collections.length
          ? loading
            ? 'Loading...'
            : 'You have no tokens!'
          : collections.map((coll) =>
              coll.tokens.map((item) => {
                const s = search.toLowerCase()
                const thisTokenIsInSearch =
                  coll.policyId.indexOf(s) !== -1 ||
                  item.t.tokenId.indexOf(s) !== -1 ||
                  item.t.tokenName?.ticker.toLowerCase().indexOf(s) !== -1 ||
                  item.t.tokenName?.display.toLowerCase().indexOf(s) !== -1 ||
                  item.t.tokenName?.onChain.toLowerCase().indexOf(s) !== -1

                if (!thisTokenIsInSearch) {
                  return null
                }

                return (
                  <button
                    key={`policy-${coll.policyId}-token-${item.t.tokenId}`}
                    type='button'
                    onClick={() => callback(item)}
                    className='w-[170px] m-1 text-xs rounded-lg hover:text-gray-200'
                  >
                    <img
                      src={item.t.image.url}
                      alt=''
                      className='w-[170px] h-[170px] object-contain rounded-lg border border-gray-500 hover:border-gray-400'
                    />
                    <p>{item.o}</p>
                    <p className='px-1 truncate'>
                      {item.t.tokenName?.ticker || item.t.tokenName?.display || item.t.tokenName?.onChain}
                    </p>
                  </button>
                )
              })
            )}
      </div>
    </div>
  )
}

export default TokenExplorer
