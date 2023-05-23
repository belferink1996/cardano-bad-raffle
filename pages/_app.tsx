import Head from 'next/head'
import { Fragment } from 'react'
import type { AppProps } from 'next/app'
import '../styles/globals.css'
import 'animate.css'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { WalletProvider } from '../contexts/WalletContext'
import { Toaster } from 'react-hot-toast'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Fragment>
      <Head>
        <meta
          name='description'
          content='A web3 tool designed to make weighted raffles on Cardano easy and accessible to everyone!'
        />

        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <meta name='author' content='Ben Elferink' />
        {/* <meta name='description' content='' /> */}
        {/* <meta name='keywords' content='' /> */}

        <link rel='icon' type='image/x-icon' href='/favicon.ico' />
        <link rel='icon' type='image/png' sizes='16x16' href='/favicon-16x16.png' />
        <link rel='icon' type='image/png' sizes='32x32' href='/favicon-32x32.png' />
        <link rel='apple-touch-icon' sizes='180x180' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/manifest.json' />

        <title>Bad Raffle | Raffle Tool</title>
      </Head>

      <Toaster />
      <Header />
      <main className='w-screen min-h-screen bg-black bg-opacity-50'>
        <WalletProvider>
          <Component {...pageProps} />
        </WalletProvider>
      </main>
      <Footer />
    </Fragment>
  )
}

export default MyApp
