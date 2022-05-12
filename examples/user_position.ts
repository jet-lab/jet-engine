/**
 * This example retrieves a users positions as well as interest rates
 * in Jet Protocol. Info is retrieved from RPC and printed to stdout.
 */

import { JetClient, JetMarket, JetObligation, JetReserve, JetUser, JET_MARKET_ADDRESS_DEVNET } from "../src"
import { Provider, Wallet } from "@project-serum/anchor"
import { Connection, PublicKey } from "@solana/web3.js"

export type CollateralizedPosition = {
  mint: string
  deposited: number
  borrowed: number
  borrowApr: number
  depositApy: number
  collateralRatio: number
}

async function getBitcoinPosition() {
  // This users positions will be fetched
  const userAddress = new PublicKey("6XEn2q37nqsYQB5R79nueGi6n3uhgjiDwxoJeAVzWvaS")
  //transaction commitment options
  const options = Provider.defaultOptions()
  const connection = new Connection("https://api.devnet.solana.com", options)
  // A wallet is not required in this example
  const wallet = undefined as any as Wallet
  const provider = new Provider(connection, wallet, options)

  // Load the Anchor IDL from RPC
  const client = await JetClient.connect(provider, true)

  // Load devnet market data from RPC
  const market = await JetMarket.load(client, JET_MARKET_ADDRESS_DEVNET)
  // Load all reserves
  const reserves = await JetReserve.loadMultiple(client, market)
  // Load user data
  const user = await JetUser.load(client, market, reserves, userAddress)
  // create obligation
  const obligation = JetObligation.create(
    market,
    user,
    reserves.map(reserve => reserve.data)
  )

  // All these can be condensed to
  const userObligation = await JetObligation.load(client, JET_MARKET_ADDRESS_DEVNET, reserves, userAddress)

  // Locate the bitcoin position and log some information
  const bitcoinMint = new PublicKey("5ym2kCTCcqCHutbQXnPdsGAGFMEVQBQzTQ1CPun9W5A5")
  // Get btc position by filtering out token mint address
  const bitcoinPosition = obligation.positions.find(position => position.reserve.tokenMint.equals(bitcoinMint))
  if (bitcoinPosition) {
    const position: CollateralizedPosition = {
      mint: bitcoinPosition.reserve.tokenMint.toBase58(),
      deposited: bitcoinPosition.collateralBalance.tokens,
      borrowed: bitcoinPosition.loanBalance.tokens,
      borrowApr: bitcoinPosition.reserve.borrowApr,
      depositApy: bitcoinPosition.reserve.depositApy,
      collateralRatio: userObligation.collateralRatio
    }

    console.log(position)
    /**
   {
      mint: '5ym2kCTCcqCHutbQXnPdsGAGFMEVQBQzTQ1CPun9W5A5',
      deposited: 2.000009,
      borrowed: 0.500125,
      borrowApr: 0.00638284671447752,
      depositApy: 0.00012888670151030092,
      collateralRatio: 2.2676541147165414
    }
    */
  }
}

getBitcoinPosition()
