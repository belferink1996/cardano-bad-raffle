'use client'
import { createContext, useState, useContext, useMemo, useEffect, ReactNode } from 'react'
import { BrowserWallet, Wallet } from '@meshsdk/core'
import BadApi, { BadApiBaseToken } from '../utils/badApi'

type ConnectFunc = (
  walletName: string,
  disableTokenGate: boolean,
  callback: (mainStr: string, subStr?: string) => void
) => Promise<void>

interface PopulatedWallet {
  stakeKey: string
  hasBadKey: boolean
  poolId: string
  tokens: BadApiBaseToken[]
}

const ctxInit: {
  availableWallets: Wallet[]
  connectWallet: ConnectFunc
  connecting: boolean
  connected: boolean
  connectedName: string
  wallet: BrowserWallet
  populatedWallet: PopulatedWallet
} = {
  availableWallets: [],
  connectWallet: async () => {},
  connecting: false,
  connected: false,
  connectedName: '',
  wallet: {} as BrowserWallet,
  populatedWallet: {} as PopulatedWallet,
}

const WalletContext = createContext(ctxInit)

export const useWallet = () => {
  return useContext(WalletContext)
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [availableWallets, setAvailableWallets] = useState<Wallet[]>(ctxInit.availableWallets)

  useEffect(() => {
    setAvailableWallets(BrowserWallet.getInstalledWallets())
  }, [])

  const [connecting, setConnecting] = useState(ctxInit.connecting)
  const [connected, setConnected] = useState(ctxInit.connected)
  const [connectedName, setConnectedName] = useState(ctxInit.connectedName)
  const [wallet, setWallet] = useState<BrowserWallet>(ctxInit.wallet)
  const [populatedWallet, setPopulatedWallet] = useState<PopulatedWallet>(ctxInit.populatedWallet)

  const connectWallet: ConnectFunc = async (_walletName, _disableTokenGate, _cb) => {
    if (connecting) return
    setConnecting(true)

    try {
      const _wallet = await BrowserWallet.enable(_walletName)

      if (!_wallet) {
        _cb('Wallet not defined')
      } else {
        const netId = await _wallet.getNetworkId()
        // 0 = testnet
        // 1 = mainnet

        if (!netId) {
          _cb("Wallet isn't connected to mainnet")
        } else {
          const stakeKeys = await _wallet.getRewardAddresses()
          const stakeKey = stakeKeys[0]

          const badApi = new BadApi()
          const { poolId, tokens } = await badApi.wallet.getData(stakeKey, {
            withStakePool: true,
            withTokens: true,
          })

          const _populatedWallet = {
            stakeKey,
            hasBadKey: !!tokens?.find(
              ({ tokenId }) => tokenId.indexOf('80e3ccc66f4dfeff6bc7d906eb166a984a1fc6d314e33721ad6add14') == 0
            ),
            poolId: poolId as string,
            tokens: tokens as BadApiBaseToken[],
          }

          if (_populatedWallet.hasBadKey) {
            setConnected(true)
            setConnectedName(_walletName)
            setWallet(_wallet)
            setPopulatedWallet(_populatedWallet)
          } else {
            if (_disableTokenGate) {
              setConnected(true)
              setConnectedName(_walletName)
              setWallet(_wallet)
              setPopulatedWallet(_populatedWallet)
            } else {
              setConnected(ctxInit.connected)
              setConnectedName(ctxInit.connectedName)
              setWallet(ctxInit.wallet)
              setPopulatedWallet(ctxInit.populatedWallet)
              _cb("Wallet doesn't have a Bad Key 🔐", 'https://jpg.store/collection/badkey')
            }
          }
        }
      }
    } catch (error) {
      console.error(error)
    }

    setConnecting(false)
  }

  const memoedValue = useMemo(
    () => ({
      availableWallets,
      connectWallet,
      connecting,
      connected,
      connectedName,
      wallet,
      populatedWallet,
    }),
    [availableWallets, connecting, connected, wallet, populatedWallet]
  )

  return <WalletContext.Provider value={memoedValue}>{children}</WalletContext.Provider>
}
