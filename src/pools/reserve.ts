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
import { AccountInfo, Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"

import { DEX_ID, DEX_ID_DEVNET } from "."
import { JetClient } from "./client"
import { JetMarket } from "./market"
import { StaticSeeds } from "./util"
import { ReserveStateStruct } from "./layout"
import type { ReserveAccount } from "./types"
import { parsePriceData, parseProductData, PriceData, ProductData } from "@pythnetwork/client"
import { BN } from "@project-serum/anchor"
import { TokenAmount } from ".."
import { parseMintAccount, parseTokenAccount } from "../common/accountParser"
import { findDerivedAccount } from "../common"
import { DerivedAccount } from "../common/associatedToken"
import { Hooks } from "../common"

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
  name: string //added name of the reserve
  symbol: string
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
  config: ReserveConfig
  availableLiquidity: TokenAmount
  marketSize: TokenAmount
  utilizationRate: number
  ccRate: number
  borrowApr: number
  depositApy: number
  priceData: PriceData
  productData: ProductData
}

export interface ReserveStateData {
  accruedUntil: anchor.BN
  outstandingDebt: TokenAmount
  uncollectedFees: TokenAmount
  totalDeposits: TokenAmount
  totalDepositNotes: TokenAmount
  totalLoanNotes: TokenAmount
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
  constructor(public client: JetClient, public market: JetMarket, public data: ReserveData) {
    this.conn = this.client.program.provider.connection
  }

  /**
   * @static
   * @param {JetClient} client
   * @param {JetMarket} market
   * @returns {JetReserve[]} JetReserve[]
   * @memberof JetReserve
   */

  static use(client: JetClient, market: JetMarket): JetReserve[] | undefined {
    return Hooks.usePromise(async () => client && market && JetReserve.loadMultiple(client, market), [client, market])
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

    const pythOracle = await JetReserve.loadPythOracle(client, data.pythOraclePrice, data.pythOracleProduct)

    const {
      value: { amount: availableLiquidity }
    } = await client.program.provider.connection.getTokenAccountBalance(
      data.vault,
      client.program.provider.opts.commitment
    )

    const mintInfo = await client.program.provider.connection.getAccountInfo(data.tokenMint)

    if (!mintInfo) {
      throw new Error("reserve tokenMint does not exist")
    }

    const reserveData = this.decodeReserveData(
      address,
      data,
      pythOracle.priceData,
      pythOracle.productData,
      mintInfo.data,
      new BN(availableLiquidity)
    )
    return new JetReserve(client, market, reserveData)
  }

  /**
   * Return all `Reserve` program accounts that are associated with the argued market.
   * @param client The client to fetch data
   * @param market The market that contains all reserves
   * @returns
   */
  static async loadMultiple(client: JetClient, market: JetMarket) {
    const reserveAddresses = market.reserves
      .map(marketReserve => marketReserve.reserve)
      .filter(reserveAddress => !reserveAddress.equals(PublicKey.default))
    const reserveInfos = (await client.program.account.reserve.fetchMultiple(reserveAddresses)) as ReserveAccount[]

    const nullReserveIndex = reserveInfos.findIndex(info => info == null)
    if (nullReserveIndex !== -1) {
      throw new Error(`Jet Reserve at address ${reserveAddresses[nullReserveIndex]} is invalid.`)
    }

    const [pythOracles, vaultInfos] = await Promise.all([
      Promise.all(
        reserveInfos.map(reserveInfo =>
          JetReserve.loadPythOracle(client, reserveInfo.pythOraclePrice, reserveInfo.pythOracleProduct)
        )
      ),
      client.program.provider.connection.getMultipleAccountsInfo(reserveInfos.map(reserve => reserve.vault))
    ])

    const nullVaultIndex = vaultInfos.findIndex(vault => vault == null)
    if (nullVaultIndex !== -1) {
      throw new Error(`Jet Vault at address ${reserveInfos[nullVaultIndex].vault} is invalid.`)
    }

    const vaults = (vaultInfos as AccountInfo<Buffer>[]).map((vault, i) =>
      parseTokenAccount(vault.data, reserveInfos[i].vault)
    )

    const multipleData = []
    for (let i = 0; i < reserveAddresses.length; i++) {
      const data = await client.program.account.reserve.fetch(reserveAddresses[i])
      if (!data) {
        throw new Error("cannot fetch reserves")
      }
      multipleData.push(data)
    }

    //load mintInfo
    const multipleMintInfo: Buffer[] = []
    for (let i = 0; i < multipleData.length; i++) {
      const mintInfo = await client.program.provider.connection.getAccountInfo(multipleData[i].tokenMint)
      if (!mintInfo) {
        throw new Error("reserve tokenMint does not exist")
      }
      multipleMintInfo.push(mintInfo.data)
    }

    const reserves = reserveInfos.map((reserveInfo, i) => {
      const pythOracle = pythOracles[i]
      const data = JetReserve.decodeReserveData(
        reserveAddresses[i],
        reserveInfo,
        pythOracle.priceData,
        pythOracle.productData,
        multipleMintInfo[i],
        new BN(vaults[i].amount.toNumber())
      )
      return new JetReserve(client, market, data)
    })

    return reserves
  }

  /**
   * Reloads this reserve and market.
   * @returns {Promise<string>}
   * @memberof JetReserve
   */
  async refresh(): Promise<void> {
    const data = await this.client.program.account.reserve.fetch(this.data.address)
    const [
      ,
      pythOracle,
      {
        value: { amount: availableLiquidity }
      }
    ] = await Promise.all([
      this.market.refresh(),
      JetReserve.loadPythOracle(this.client, data.pythOraclePrice, data.pythOracleProduct),
      this.client.program.provider.connection.getTokenAccountBalance(
        data.vault,
        this.client.program.provider.opts.commitment
      )
    ])
    const mintInfo = await this.client.program.provider.connection.getAccountInfo(data.tokenMint)
    if (!mintInfo) {
      throw new Error("reserve tokenMint does not exist")
    }
    this.data = JetReserve.decodeReserveData(
      this.data.address,
      data,
      pythOracle.priceData,
      pythOracle.productData,
      mintInfo.data,
      new BN(availableLiquidity)
    )
  }

  static async loadPythOracle(client: JetClient, pythOraclePrice: PublicKey, pythOracleProduct: PublicKey) {
    const [priceInfo, productInfo] = await client.program.provider.connection.getMultipleAccountsInfo([
      pythOraclePrice,
      pythOracleProduct
    ])
    if (!priceInfo) {
      throw new Error("Invalid pyth oracle price")
    } else if (!productInfo) {
      throw new Error("Invalid pyth oracle product")
    }
    const priceData = parsePriceData(priceInfo.data as Buffer)
    const productData = parseProductData(productInfo.data as Buffer)
    return { priceData, productData }
  }

  private static decodeReserveData(
    address: PublicKey,
    data: any,
    priceData: PriceData,
    productData: ProductData,
    mintData: Buffer,
    availableLiquidityLamports: BN
  ) {
    const mint = parseMintAccount(mintData)
    const availableLiquidity = new TokenAmount(availableLiquidityLamports, mint.decimals, data.tokenMint)
    const state = ReserveStateStruct.decode(new Uint8Array(data.state))
    state.outstandingDebt = new TokenAmount(
      (state.outstandingDebt as BN).div(new BN(1e15)),
      mint.decimals,
      data.tokenMint
    )
    const reserve: ReserveData = {
      ...data,
      address,
      state,
      priceData,
      productData,
      availableLiquidity
    }
    // Derive market reserve values
    reserve.marketSize = reserve.state.outstandingDebt.add(reserve.availableLiquidity)
    reserve.utilizationRate = reserve.marketSize.isZero()
      ? 0
      : reserve.state.outstandingDebt.tokens / reserve.marketSize.tokens
    reserve.ccRate = JetReserve.getCcRate(reserve.config, reserve.utilizationRate)
    reserve.borrowApr = JetReserve.getBorrowRate(reserve.ccRate, reserve.config.manageFeeRate)
    reserve.depositApy = JetReserve.getDepositRate(reserve.ccRate, reserve.utilizationRate)

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
  static deriveAccounts(client: JetClient, address: PublicKey, tokenMint: PublicKey): ReserveAccounts {
    return {
      vault: findDerivedAccount(client.program.programId, StaticSeeds.Vault, address),
      feeNoteVault: findDerivedAccount(client.program.programId, StaticSeeds.FeeVault, address),
      dexSwapTokens: findDerivedAccount(client.program.programId, StaticSeeds.DexSwapTokens, address),
      dexOpenOrders: findDerivedAccount(client.program.programId, StaticSeeds.DexOpenOrders, address),

      loanNoteMint: findDerivedAccount(client.program.programId, StaticSeeds.Loans, address, tokenMint),
      depositNoteMint: findDerivedAccount(client.program.programId, StaticSeeds.Deposits, address, tokenMint)
    }
  }

  /** Linear interpolation between (x0, y0) and (x1, y1) */
  private static interpolate = (x: number, x0: number, x1: number, y0: number, y1: number): number => {
    console.assert(x >= x0)
    console.assert(x <= x1)

    return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
  }

  /** Continuous Compounding Rate */
  private static getCcRate = (reserveConfig: ReserveConfig, utilRate: number): number => {
    const basisPointFactor = 10000
    const util1 = reserveConfig.utilizationRate1 / basisPointFactor
    const util2 = reserveConfig.utilizationRate2 / basisPointFactor
    const borrow0 = reserveConfig.borrowRate0 / basisPointFactor
    const borrow1 = reserveConfig.borrowRate1 / basisPointFactor
    const borrow2 = reserveConfig.borrowRate2 / basisPointFactor
    const borrow3 = reserveConfig.borrowRate3 / basisPointFactor

    if (utilRate <= util1) {
      return JetReserve.interpolate(utilRate, 0, util1, borrow0, borrow1)
    } else if (utilRate <= util2) {
      return JetReserve.interpolate(utilRate, util1, util2, borrow1, borrow2)
    } else {
      return JetReserve.interpolate(utilRate, util2, 1, borrow2, borrow3)
    }
  }

  /** Borrow rate
   */
  private static getBorrowRate = (ccRate: number, fee: number): number => {
    const basisPointFactor = 10000
    fee = fee / basisPointFactor
    const secondsPerYear: number = 365 * 24 * 60 * 60
    const rt = ccRate / secondsPerYear

    return Math.log1p((1 + fee) * Math.expm1(rt)) * secondsPerYear
  }

  /** Deposit rate
   */
  private static getDepositRate = (ccRate: number, utilRatio: number): number => {
    const secondsPerYear: number = 365 * 24 * 60 * 60
    const rt = ccRate / secondsPerYear

    return Math.log1p(Math.expm1(rt)) * secondsPerYear * utilRatio
  }
}
