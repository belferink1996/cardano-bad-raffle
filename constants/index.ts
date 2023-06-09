export const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || ''

export const APP_WALLET_MNEMONIC: string[] = Array.isArray(process.env.APP_WALLET_MNEMONIC)
  ? process.env.APP_WALLET_MNEMONIC
  : process.env.APP_WALLET_MNEMONIC?.split(',') || []

export const APP_WALLET_ADDRESS = process.env.NEXT_PUBLIC_APP_WALLET_ADDRESS || ''

export const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
export const FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
export const FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
export const FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
export const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
export const FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

export const RAFFLES_DB_PATH = 'tools/bad-raffle/raffles'

export const MINUTES = 'Minutes'
export const HOURS = 'Hours'
export const DAYS = 'Days'
export const WEEKS = 'Weeks'
export const MONTHS = 'Months'
