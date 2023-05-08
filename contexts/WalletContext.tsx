'use client'
import { createContext, useState, useContext, useMemo, useEffect, ReactNode } from 'react'
import { BrowserWallet, Wallet } from '@meshsdk/core'

type ConnectFunc = (
  walletName: string,
  disableTokenGate: boolean,
  callback: (mainStr: string, subStr?: string) => void
) => Promise<void>

const ctxInit: {
  availableWallets: Wallet[]
  connectWallet: ConnectFunc
  connecting: boolean
  connected: boolean
  connectedName: string
  hasNoKey: boolean
  numOfKeys: number
  wallet: BrowserWallet
} = {
  availableWallets: [],
  connectWallet: async () => {},
  connecting: false,
  connected: false,
  connectedName: '',
  hasNoKey: false,
  numOfKeys: 0,
  wallet: {} as BrowserWallet,
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
  const [hasNoKey, setHasNoKey] = useState(ctxInit.hasNoKey)
  const [numOfKeys, setNumOfkeys] = useState(ctxInit.numOfKeys)
  const [wallet, setWallet] = useState<BrowserWallet>(ctxInit.wallet)

  const connectWallet: ConnectFunc = async (_walletName, _disableTokenGate, _cb) => {
    if (connecting) return
    setConnecting(true)

    try {
      const _wallet = await BrowserWallet.enable(_walletName)

      if (_wallet) {
        const netId = await _wallet.getNetworkId()
        // 0 = testnet
        // 1 = mainnet

        if (netId) {
          const pIds = await _wallet.getPolicyIds()

          // Bad Key Policy ID
          if (pIds.includes('80e3ccc66f4dfeff6bc7d906eb166a984a1fc6d314e33721ad6add14')) {
            const keys = await _wallet.getPolicyIdAssets(
              '80e3ccc66f4dfeff6bc7d906eb166a984a1fc6d314e33721ad6add14'
            )

            setHasNoKey(false)
            setNumOfkeys(keys.length)
            setWallet(_wallet)
            setConnected(true)
            setConnectedName(_walletName)
          } else {
            setHasNoKey(true)
            setNumOfkeys(0)
            if (_disableTokenGate) {
              setWallet(_wallet)
              setConnected(true)
              setConnectedName(_walletName)
            } else {
              setWallet(ctxInit.wallet)
              setConnected(ctxInit.connected)
              setConnectedName(ctxInit.connectedName)
              _cb("Wallet doesn't have a Bad Key 🔐", 'https://jpg.store/collection/badkey')
            }
          }
        } else {
          _cb("Wallet isn't connected to mainnet")
        }
      } else {
        _cb('Wallet not defined')
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
      hasNoKey,
      numOfKeys,
      wallet,
    }),
    [availableWallets, connecting, connected, hasNoKey, numOfKeys, wallet]
  )

  return <WalletContext.Provider value={memoedValue}>{children}</WalletContext.Provider>
}
