import { JetClient, JetMarket, JetObligation, JetReserve, JetUser, JET_MARKET_ADDRESS_DEVNET } from "../src"
import { Provider, Wallet } from "@project-serum/anchor"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"

export type CollateralizedPosition = {
  mint: string;
  deposited: number;
  borrowed: number;
  borrowApy: number;
  depositApy: number;
}

async function getBitcoinPosition() {
  // This users positions will be fetched
  const userAddress = new PublicKey("Ayr9Kuhw32F4VB5JhqX3C6dfWwHrsKzBoyEGhjDvXtn2");

  const options = Provider.defaultOptions();
  const connection = new Connection("https://api.devnet.solana.com", options);
  const wallet = new Wallet(Keypair.generate())
  const provider = new Provider(connection, wallet, options);

  // Load the Anchor IDL from RPC
  const client = await JetClient.connect(provider, true)

  // Load market data from RPC
  // The following can be condensed to
  // const obligation = await JetObligation.load(client, JET_MARKET_ADDRESS_DEVNET, userAddress);
  const market = await JetMarket.load(client, JET_MARKET_ADDRESS_DEVNET);
  const user = await JetUser.load(client, market, userAddress)
  const reserves = await JetReserve.loadMultiple(client, market);
  const obligation = JetObligation.create(market, user, reserves.map(reserve => reserve.data));


  // Locate the bitcoin position and log some information
  const bitcoinMint = new PublicKey("5ym2kCTCcqCHutbQXnPdsGAGFMEVQBQzTQ1CPun9W5A5");
  const bitcoinPosition = obligation.positions.find(position => position.reserve.tokenMint.equals(bitcoinMint))

  if (bitcoinPosition) {
    const position: CollateralizedPosition = {
      mint: bitcoinPosition.reserve.tokenMint.toBase58(),
      // Bitcoin has 6 decimals, divide by 1e6
      deposited: bitcoinPosition.collateralBalance.toNumber() / 1e6, 
      borrowed: bitcoinPosition.loanBalance.toNumber() / 1e6,
      // FIXME: Asking for borrow Apy
      borrowApy: bitcoinPosition.reserve.borrowApr,
      depositApy: bitcoinPosition.reserve.depositApy,
    }

    console.log(position)
    /**
     * {
     *   mint: '5ym2kCTCcqCHutbQXnPdsGAGFMEVQBQzTQ1CPun9W5A5',
     *   deposited: 0.097907,
     *   borrowed: 0,
     *   borrowApy: undefined,
     *   depositApy: undefined
     * }
     */
  }
}
getBitcoinPosition()
