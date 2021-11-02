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

import { PublicKey, Keypair, GetProgramAccountsFilter } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token"
import * as anchor from "@project-serum/anchor"
import * as BL from "@solana/buffer-layout"
import { CreateReserveParams, JetReserve } from "./reserve"
import { JetClient, DEX_ID, DEX_ID_DEVNET, Obligation, DerivedAccount } from "."
import { StaticSeeds, pubkeyField, numberField } from "./util"

const MAX_RESERVES = 32

const ReserveInfoStruct = BL.struct([
  pubkeyField("address"),
  BL.blob(80, "_UNUSED_0_"),
  numberField("price"),
  numberField("depositNoteExchangeRate"),
  numberField("loanNoteExchangeRate"),
  numberField("minCollateralRatio"),
  BL.u16("liquidationBonus"),
  BL.blob(158, "_UNUSED_1_"),
  BL.blob(16, "_UNUSED_CACHE")
])

const MarketReserveInfoList = BL.seq(ReserveInfoStruct, MAX_RESERVES)

export interface JetMarketReserveInfo {
  address: PublicKey
  price: anchor.BN
  depositNoteExchangeRate: anchor.BN
  loanNoteExchangeRate: anchor.BN
}

export interface JetMarketData {
  address: PublicKey
  quoteTokenMint: PublicKey
  quoteCurrency: string
  marketAuthority: PublicKey
  owner: PublicKey
  reserves: JetMarketReserveInfo[]
}

/**
 * TODO:
 * @export
 * @class JetMarket
 * @implements {JetMarketData}
 */
export class JetMarket implements JetMarketData {
  /**
   * Creates an instance of JetMarket.
   * @param {JetClient} client
   * @param {PublicKey} address
   * @param {PublicKey} quoteTokenMint
   * @param {string} quoteCurrency
   * @param {PublicKey} marketAuthority
   * @param {PublicKey} owner
   * @param {JetMarketReserveInfo[]} reserves
   * @memberof JetMarket
   */
  private constructor(
    private client: JetClient,
    public address: PublicKey,
    public quoteTokenMint: PublicKey,
    public quoteCurrency: string,
    public marketAuthority: PublicKey,
    public owner: PublicKey,
    public reserves: JetMarketReserveInfo[]
  ) {}

  /**
   * Load the market account data from the network.
   * @param {JetClient} client The program client
   * @param {PublicKey} address The address of the market.
   * @returns {Promise<JetMarket>} An object for interacting with the Jet market.
   * @memberof JetMarket
   */
  static async load(client: JetClient, address: PublicKey): Promise<JetMarket> {
    const data = await client.program.account.market.fetch(address)
    return this.decode(client, address, data);
  }

  /**
   * Get the latest market account data from the network.
   * @memberof JetMarket
   */
  async refresh() {
    const market = await JetMarket.load(this.client, this.address)

    this.reserves = market.reserves
    this.owner = market.owner
    this.marketAuthority = market.marketAuthority
    this.quoteCurrency = market.quoteCurrency
    this.quoteTokenMint = market.quoteTokenMint
  }

  /**
   * Return all `Market` program accounts that have been created
   * @param {GetProgramAccountsFilter[]} [filters]
   * @returns {Promise<ProgramAccount<Market>[]>}
   * @memberof JetClient
   */
   static async allMarkets(client: JetClient, filters?: GetProgramAccountsFilter[]): Promise<JetMarket[]> {
    const accounts = await client.program.account.market.all(filters)
    return accounts.map(account => JetMarket.decode(client, account.publicKey, account.account));
  }

  /**
   * Creates an instance of JetMarket from an anchor-decoded account. 
   */
   private static decode(client: JetClient, address: PublicKey, data: any) {
    const reserveInfoData = new Uint8Array(data.reserves)
    const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as JetMarketReserveInfo[]

    return new JetMarket(
      client,
      address,
      data.quoteTokenMint,
      data.quoteCurrency,
      data.marketAuthority,
      data.owner,
      reserveInfoList
    )
  }

  /**
   * TODO:
   * @param {u64} flags
   * @memberof JetMarket
   */
  async setFlags(flags: u64) {
    await this.client.program.rpc.setMarketFlags(flags, {
      accounts: {
        market: this.address,
        owner: this.owner
      }
    })
  }

  /**
   * TODO:
   * @param {CreateMarketParams} params
   * @returns {Promise<JetMarket>}
   * @memberof JetClient
   */
  async createMarket(params: CreateMarketParams): Promise<JetMarket> {
    let account = params.account

    if (account == undefined) {
      account = Keypair.generate()
    }

    await this.client.program.rpc.initMarket(
      params.owner,
      params.quoteCurrencyName,
      params.quoteCurrencyMint,
      {
        accounts: {
          market: account.publicKey
        },
        signers: [account],
        instructions: [await this.client.program.account.market.createInstruction(account)]
      }
    )

    return JetMarket.load(this.client, account.publicKey)
  }

  /**
   * TODO:
   * @param {CreateReserveParams} params
   * @returns {Promise<JetReserve>}
   * @memberof JetMarket
   */
  async createReserve(params: CreateReserveParams): Promise<JetReserve> {
    let account = params.account

    if (account == undefined) {
      account = Keypair.generate()
    }

    const derivedAccounts = await JetReserve.deriveAccounts(
      this.client,
      account.publicKey,
      params.tokenMint
    )

    const bumpSeeds = {
      vault: derivedAccounts.vault.bumpSeed,
      feeNoteVault: derivedAccounts.feeNoteVault.bumpSeed,
      dexOpenOrders: derivedAccounts.dexOpenOrders.bumpSeed,
      dexSwapTokens: derivedAccounts.dexSwapTokens.bumpSeed,

      loanNoteMint: derivedAccounts.loanNoteMint.bumpSeed,
      depositNoteMint: derivedAccounts.depositNoteMint.bumpSeed
    }

    const createReserveAccount = await this.client.program.account.reserve.createInstruction(
      account
    )

    const dexProgram = this.client.devnet ? DEX_ID_DEVNET : DEX_ID;

    await this.client.program.rpc.initReserve(bumpSeeds, params.config, {
      accounts: {
        market: this.address,
        marketAuthority: this.marketAuthority,
        owner: this.owner,

        oracleProduct: params.pythOracleProduct,
        oraclePrice: params.pythOraclePrice,

        reserve: account.publicKey,
        vault: derivedAccounts.vault.address,
        feeNoteVault: derivedAccounts.feeNoteVault.address,
        dexSwapTokens: derivedAccounts.dexSwapTokens.address,
        dexOpenOrders: derivedAccounts.dexOpenOrders.address,
        loanNoteMint: derivedAccounts.loanNoteMint.address,
        depositNoteMint: derivedAccounts.depositNoteMint.address,

        dexMarket: params.dexMarket,
        quoteTokenMint: this.quoteTokenMint,
        tokenMint: params.tokenMint,

        tokenProgram: TOKEN_PROGRAM_ID,
        dexProgram,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      instructions: [createReserveAccount],
      signers: [account]
    })

    return JetReserve.load(this.client, account.publicKey, this)
  }

  /**
   * Fetch the `Obligation` account that is associated with
   * the argued address or public key if it exists, otherwise
   * will resolve to `null`.
   * @param {DerivedAccount} address
   * @returns {(Promise<Obligation | null>)}
   * @memberof JetClient
   */
  async getAssociatedObligation(account: DerivedAccount): Promise<Obligation | null> {
    return (this.client.program.account.obligation as any).fetchNullable(account.address)
  }

  /**
   * Derives the program address and nonce bump for an
   * `Obligation` account with the current market and
   * argued borrower keys.
   * @param {PublicKey} borrower
   * @returns {Promise<DerivedAccount>}
   * @memberof JetClient
   */
  async getAssociatedObligationAddress(borrower: PublicKey): Promise<DerivedAccount> {
    return this.client.findDerivedAccount([
      Buffer.from(StaticSeeds.Obligation),
      this.address.toBytes(),
      borrower.toBytes()
    ])
  }
}

export interface CreateMarketParams {
  /**
   * The address that must sign to make future changes to the market,
   * such as modifying the available reserves (or their configuation)
   */
  owner: PublicKey

  /**
   * The token mint for the currency being used to quote the value of
   * all other tokens stored in reserves.
   */
  quoteCurrencyMint: PublicKey

  /**
   * The name of the currency used for quotes, this has to match the
   * name specified in any Pyth/oracle accounts.
   */
  quoteCurrencyName: string

  /**
   * The account to use for the market data.
   *
   * If not provided an account will be generated.
   */
  account?: Keypair
}

export enum MarketFlags {
  HaltBorrows = 1 << 0,
  HaltRepays = 1 << 1,
  HaltDeposits = 1 << 2,
  HaltAll = HaltBorrows | HaltRepays | HaltDeposits
}
