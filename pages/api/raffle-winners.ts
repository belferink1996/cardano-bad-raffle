import type { NextApiRequest, NextApiResponse } from 'next'
import { AppWallet, BlockfrostProvider, Transaction } from '@meshsdk/core'
import { firebase, firestore } from '../../utils/firebase'
import BadApi, { BadApiTransaction } from '../../utils/badApi'
import { APP_WALLET_MNEMONIC, BLOCKFROST_API_KEY, RAFFLES_DB_PATH } from '../../constants'
import type { Raffle } from '../../@types'

const badApi = new BadApi()

interface PayTo {
  stakeKey: string
  address: string
  amount: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(() => resolve(true), ms))

const txConfirmation = async (_txHash: string): Promise<BadApiTransaction> => {
  try {
    const data = await badApi.transaction.getData(_txHash)

    if (data.block) {
      return data
    } else {
      await sleep(1000)
      return await txConfirmation(_txHash)
    }
  } catch (error: any) {
    const errMsg = error?.response?.data || error?.message || error?.toString() || 'UNKNOWN ERROR'

    if (errMsg === `The requested component has not been found. ${_txHash}`) {
      await sleep(1000)
      return await txConfirmation(_txHash)
    } else {
      throw new Error(errMsg)
    }
  }
}

const sendTokenToWallets = async (tokenId: string, payTo: PayTo[], difference?: number): Promise<any> => {
  console.log('Batching TXs')

  const batchSize = difference ? Math.floor(difference * payTo.length) : payTo.length
  const batches: PayTo[][] = []

  for (let i = 0; i < payTo.length; i += batchSize) {
    batches.push(payTo.slice(i, (i / batchSize + 1) * batchSize))
  }

  try {
    const provider = new BlockfrostProvider(BLOCKFROST_API_KEY)
    const wallet = new AppWallet({
      networkId: 1,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: APP_WALLET_MNEMONIC,
      },
    })

    const txHashes: string[] = []

    for await (const [idx, batch] of batches.entries()) {
      const tx = new Transaction({ initiator: wallet })

      for (const { address, amount } of batch) {
        tx.sendAssets({ address }, [
          {
            unit: tokenId,
            quantity: amount.toString(),
          },
        ])
      }

      // this may throw an error if TX size is over the limit
      const unsignedTx = await tx.build()
      console.log(`Building TX ${idx + 1} of ${batches.length}`)

      const signedTx = await wallet.signTx(unsignedTx)
      const txHash = await wallet.submitTx(signedTx)

      // console.log('Awaiting network confirmation...')
      // await txConfirmation(txHash)
      // console.log('Confirmed!', txHash)
      console.log('TX submitted!', txHash)

      txHashes.push(txHash)
    }

    return txHashes
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || ''
    console.error(errMsg)

    if (!!errMsg && errMsg.indexOf('Maximum transaction size') !== -1) {
      // [Transaction] An error occurred during build: Maximum transaction size of 16384 exceeded. Found: 21861.
      const splitMessage: string[] = errMsg.split(' ')
      const [max, curr] = splitMessage.filter((str) => !isNaN(Number(str))).map((str) => Number(str))
      // [16384, 21861]

      const newDifference = (difference || 1) * (max / curr)

      return await sendTokenToWallets(tokenId, payTo, newDifference)
    }

    throw new Error(errMsg)
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req

  try {
    switch (method) {
      case 'GET': {
        const { FieldValue } = firebase.firestore
        const collection = firestore.collection(RAFFLES_DB_PATH)
        const collectionQuery = await collection.where('active', '==', true).get()

        const now = Date.now()
        const docsThatNeedToRaffleWinners = collectionQuery.docs
          .map((doc) => {
            const data = doc.data() as Raffle

            return {
              ...data,
              active: now < data.endAt,
              id: doc.id,
            }
          })
          .filter((item) => !item.active)

        for await (const {
          id,
          stakeKey,
          isToken,
          token,
          txDeposit,
          amount,
          numOfWinners,
          entries = [],
        } of docsThatNeedToRaffleWinners) {
          if (isToken && !txDeposit) {
            await collection.doc(id).delete()
          } else {
            const winners: PayTo[] = []
            const enteredStakeKeys: string[] = entries
              .map((entry) => new Array(entry.points).fill(entry.stakeKey))
              .flat()

            let winnersCount = Math.min(numOfWinners, enteredStakeKeys.length)

            if (!winnersCount) {
              // basically returns prize to the owner
              enteredStakeKeys.push(stakeKey)
              winnersCount = 1
            }

            const amountPerWinner = Math.floor(amount / winnersCount)

            for (let i = 1; i <= winnersCount; i++) {
              const randomIdx = Math.floor(Math.random() * enteredStakeKeys.length)
              const thisStakeKey = enteredStakeKeys[randomIdx]

              const wallet = await badApi.wallet.getData(thisStakeKey)
              const { address } = wallet.addresses[0]

              const found = winners.find((obj) => obj.stakeKey === thisStakeKey)

              if (!found) {
                winners.push({
                  stakeKey: thisStakeKey,
                  address,
                  amount: amountPerWinner,
                })
              }

              enteredStakeKeys.splice(randomIdx, 1)
            }

            const updateBody: {
              active: boolean
              winners: firebase.firestore.FieldValue
              txsWithdrawn?: firebase.firestore.FieldValue
            } = {
              active: false,
              winners: FieldValue.arrayUnion(...winners),
            }

            if (isToken) {
              const txHashes = await sendTokenToWallets(token.tokenId, winners)
              updateBody.txsWithdrawn = FieldValue.arrayUnion(...txHashes)
            }

            await collection.doc(id).update(updateBody)
          }
        }

        return res.status(204).end()
      }

      default: {
        res.setHeader('Allow', 'GET')
        return res.status(405).end()
      }
    }
  } catch (error) {
    console.error(error)
    return res.status(500).end()
  }
}

export default handler
