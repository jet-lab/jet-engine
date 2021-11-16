/*
 * Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as anchor from "@project-serum/anchor"
import { Market as SerumMarket } from "@project-serum/serum"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import {
  Connection,
  GetProgramAccountsFilter,
  Keypair,
  MemcmpFilter,
  PublicKey,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js"

import { DEX_ID, DEX_ID_DEVNET } from "."
import { JetClient, DerivedAccount } from "./client"
import { JetMarket } from "./market"
import { StaticSeeds } from "./util"
import { ReserveStateStruct } from "./layout"
import type { ReserveAccount } from "./types"
import { parsePriceData, parseProductData, PriceData, ProductData } from "@pythnetwork/client"

export interface ReserveConfig {
  utilizationRate1: number
  utilizationRate2: number
  borrowRate0: number
  borrowRate1: number
  borrowRate2: number
  borrowRate3: number
  minCollateralRatio: number
  liquidationPremium: number
  manageFeeCollectionThreshold: anchor.BN
  manageFeeRate: number
  loanOriginationFee: number
  liquidationSlippage: number
  liquidationDexTradeMax: anchor.BN
  reserved0: number
  reserved1: number[]
}

export interface ReserveAccounts {
  vault: DerivedAccount
  feeNoteVault: DerivedAccount
  dexSwapTokens: DerivedAccount
  dexOpenOrders: DerivedAccount

  loanNoteMint: DerivedAccount
  depositNoteMint: DerivedAccount
}

export interface CreateReserveParams {
  /**
   * The Serum market for the reserve.
   */
  dexMarket: PublicKey

  /**
   * The mint for the token to be stored in the reserve.
   */
  tokenMint: PublicKey

  /**
   * The Pyth account containing the price information for the reserve token.
   */
  pythOraclePrice: PublicKey

  /**
   * The Pyth account containing the metadata about the reserve token.
   */
  pythOracleProduct: PublicKey

  /**
   * The initial configuration for the reserve
   */
  config: ReserveConfig

  /**
   * The account to use for the reserve data.
   *
   * If not provided an account will be generated.
   */
  account?: Keypair
}

export interface ReserveData {
  address: PublicKey
  index: number
  market: PublicKey
  pythOraclePrice: PublicKey
  pythOracleProduct: PublicKey
  tokenMint: PublicKey
  depositNoteMint: PublicKey
  loanNoteMint: PublicKey
  vault: PublicKey
  feeNoteVault: PublicKey
  dexOpenOrders: PublicKey
  dexSwapTokens: PublicKey
  dexMarket: PublicKey
  state: ReserveStateData
}

export interface ReserveStateData {
  accruedUntil: anchor.BN
  outstandingDebt: anchor.BN
  uncollectedFees: anchor.BN
  totalDeposits: anchor.BN
  totalDepositNotes: anchor.BN
  totalLoanNotes: anchor.BN
}

export interface ReserveDexMarketAccounts {
  market: PublicKey
  openOrders: PublicKey
  requestQueue: PublicKey
  eventQueue: PublicKey
  bids: PublicKey
  asks: PublicKey
  coinVault: PublicKey
  pcVault: PublicKey
  vaultSigner: PublicKey
}

export interface UpdateReserveConfigParams {
  config: ReserveConfig
  reserve: PublicKey
  market: PublicKey
  owner: Keypair
}

/**
 * TODO:
 * @export
 * @class JetReserve
 */
export class JetReserve {
  private conn: Connection

  /**
   * Creates an instance of JetReserve.
   * @param {JetClient} client
   * @param {JetMarket} market
   * @param {PublicKey} address
   * @param {ReserveData} data
   * @memberof JetReserve
   */
  constructor(
    private client: JetClient,
    private market: JetMarket,
    public data: ReserveData,
    public price: PriceData,
    public product: ProductData
  ) {
    this.conn = this.client.program.provider.connection
  }

  /**
   * Load a `Reserve` program account.
   * @static
   * @param {JetClient} client
   * @param {PublicKey} address The reserve address
   * @param {JetMarket} maybeMarket
   * The `Market` program account associated with the reserve.
   * If it is not provided it will also be loaded.
   * @returns {Promise<JetReserve>}
   * @memberof JetReserve
   */
  static async load(client: JetClient, address: PublicKey, maybeMarket?: JetMarket): Promise<JetReserve> {
    const data = await client.program.account.reserve.fetch(address)
    const market = maybeMarket || (await JetMarket.load(client, data.market))
    const reserveData = this.decodeReserveData(address, data)

    const { price, product } = await JetReserve.loadPythOracle(client, reserveData)

    return new JetReserve(client, market, reserveData, price, product)
  }

  /**
   * Reloads this reserve and market.
   * @returns {Promise<string>}
   * @memberof JetReserve
   */
  async refresh(): Promise<void> {
    await this.market.refresh()
    const data = await this.client.program.account.reserve.fetch(this.data.address)
    this.data = JetReserve.decodeReserveData(this.data.address, data)
    const { price, product } = await JetReserve.loadPythOracle(this.client, this.data)
    this.price = price
    this.product = product
  }

  static async loadPythOracle(client: JetClient, data: ReserveData) {
    const [priceInfo, productInfo] = await client.program.provider.connection.getMultipleAccountsInfo([
      data.pythOraclePrice,
      data.pythOracleProduct
    ])
    if (!priceInfo) {
      throw new Error("Invalid pyth oracle price")
    } else if (!productInfo) {
      throw new Error("Invalid pyth oracle product")
    }
    const price = parsePriceData(priceInfo.data)
    const product = parseProductData(productInfo.data)
    return { price, product }
  }

  /**
   * Return all `Reserve` program accounts that have been created
   * @param {GetProgramAccountsFilter[]} [filters]
   * @returns {Promise<ProgramAccount<Reserve>[]>}
   * @memberof JetClient
   */
  static async allReserves(client: JetClient, filters?: GetProgramAccountsFilter[]): Promise<JetReserve[]> {
    const reserveAccounts: anchor.ProgramAccount<ReserveAccount>[] = await client.program.account.reserve.all(filters)

    const uniqueMarketAddresses = [...new Set(reserveAccounts.map(account => account.account.market.toBase58()))]

    const marketPromises = uniqueMarketAddresses.map(marketAddress =>
      JetMarket.load(client, new PublicKey(marketAddress))
    )

    const markets = (await Promise.allSettled(marketPromises)).reduce(
      (acc, market) => (market.status === "fulfilled" ? [...acc, market.value] : acc),
      [] as JetMarket[]
    )

    const datas = reserveAccounts.map(account => {
      return JetReserve.decodeReserveData(account.publicKey, account.account)
    })

    const pythOraclePromises = datas.map(data => JetReserve.loadPythOracle(client, data))
    const pythOracles = await Promise.all(pythOraclePromises)

    const reserves = datas.map((data, i) => {
      const market = markets.find(market => market.address.equals(data.market)) as JetMarket
      const pythOracle = pythOracles[i]
      return new JetReserve(client, market, data, pythOracle.price, pythOracle.product)
    })
    return reserves
  }

  /**
   * Return all `Reserve` program accounts that are associated with the argued market.
   * @param {GetProgramAccountsFilter[]} [filters]
   * @returns {Promise<ProgramAccount<Reserve>[]>}
   * @memberof JetClient
   */
  static async allReservesByMarket(client: JetClient, marketAddress: PublicKey): Promise<JetReserve[]> {
    const filter: MemcmpFilter = {
      memcmp: {
        // The market field of the reserve account
        // There is a hidden 8 byte discriminator field at the start of the reserve account
        offset: 8 + 2 + 2 + 4,
        // The value of the market pubkey
        bytes: marketAddress.toBase58()
      }
    }
    return await this.allReserves(client, [filter])
  }

  private static decodeReserveData(address: PublicKey, data: any) {
    const state = ReserveStateStruct.decode(new Uint8Array(data.state)) as ReserveStateData
    const reserve: ReserveData = {
      ...data,
      address,
      state
    }

    return reserve
  }

  async sendRefreshTx(): Promise<string> {
    const tx = new Transaction().add(this.makeRefreshIx())
    return await this.client.program.provider.send(tx)
  }

  /**
   * TODO:
   * @returns {TransactionInstruction}
   * @memberof JetReserve
   */
  makeRefreshIx(): TransactionInstruction {
    return this.client.program.instruction.refreshReserve({
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        reserve: this.data.address,
        feeNoteVault: this.data.feeNoteVault,
        depositNoteMint: this.data.depositNoteMint,
        pythOraclePrice: this.data.pythOraclePrice,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    })
  }

  /**
   * TODO:
   * @returns {Promise<ReserveDexMarketAccounts>}
   * @memberof JetReserve
   */
  async loadDexMarketAccounts(): Promise<ReserveDexMarketAccounts> {
    if (this.data.tokenMint.equals(this.market.quoteTokenMint)) {
      // The quote token doesn't have a DEX market
      const defaultAccount = this.data.dexSwapTokens
      return {
        market: defaultAccount,
        openOrders: defaultAccount,
        requestQueue: defaultAccount,
        eventQueue: defaultAccount,
        bids: defaultAccount,
        asks: defaultAccount,
        coinVault: defaultAccount,
        pcVault: defaultAccount,
        vaultSigner: defaultAccount
      }
    }

    const dexMarketData = await this.conn.getAccountInfo(this.data.dexMarket)
    const dexMarket = await SerumMarket.getLayout(DEX_ID).decode(dexMarketData?.data)

    const dexSignerNonce = dexMarket.vaultSignerNonce
    const vaultSigner = await PublicKey.createProgramAddress(
      [dexMarket.ownAddress.toBuffer(), dexSignerNonce.toArrayLike(Buffer, "le", 8)],
      this.client.devnet ? DEX_ID_DEVNET : DEX_ID
    )

    return {
      market: dexMarket.ownAddress,
      openOrders: this.data.dexOpenOrders,
      requestQueue: dexMarket.requestQueue,
      eventQueue: dexMarket.eventQueue,
      bids: dexMarket.bids,
      asks: dexMarket.asks,
      coinVault: dexMarket.baseVault,
      pcVault: dexMarket.quoteVault,
      vaultSigner
    }
  }

  async updateReserveConfig(params: UpdateReserveConfigParams): Promise<void> {
    await this.client.program.rpc.updateReserveConfig(params.config, {
      accounts: {
        market: params.market,
        reserve: params.reserve,
        owner: params.owner.publicKey
      },
      signers: [params.owner]
    })
  }

  /**
   * Derive all the associated accounts for a reserve.
   * @param {JetClient} client The client to use for the request
   * @param {PublicKey} address The reserve address to derive the accounts for.
   * @param {PublicKey} tokenMint The address of the mint for the token stored in the reserve.
   * @returns {Promise<ReserveAccounts>}
   * @memberof JetReserve
   */
  static async deriveAccounts(client: JetClient, address: PublicKey, tokenMint: PublicKey): Promise<ReserveAccounts> {
    return {
      vault: await client.findDerivedAccount([StaticSeeds.Vault, address]),
      feeNoteVault: await client.findDerivedAccount([StaticSeeds.FeeVault, address]),
      dexSwapTokens: await client.findDerivedAccount([StaticSeeds.DexSwapTokens, address]),
      dexOpenOrders: await client.findDerivedAccount([StaticSeeds.DexOpenOrders, address]),

      loanNoteMint: await client.findDerivedAccount([StaticSeeds.Loans, address, tokenMint]),
      depositNoteMint: await client.findDerivedAccount([StaticSeeds.Deposits, address, tokenMint])
    }
  }
}
