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
import { Program, Provider, ProgramAccount, Address, web3 } from "@project-serum/anchor"
import EventEmitter from "eventemitter3"
import { Jet } from "./idl/jet"
import IDL from "./idl/jet.json"
import { CreateMarketParams, JetMarket } from "./market"
import { Market, Obligation, Reserve } from "./types"
import { JET_ID } from "."

interface ToBytes {
  toBytes(): Uint8Array
}

interface HasPublicKey {
  publicKey: PublicKey
}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string

/**
 * Utility class to store a calculated PDA and
 * the bump nonce associated with it.
 * @export
 * @class DerivedAccount
 */
export class DerivedAccount {
  /**
   * Creates an instance of DerivedAccount.
   * @param {PublicKey} address
   * @param {number} bumpSeed
   * @memberof DerivedAccount
   */
  constructor(public address: PublicKey, public bumpSeed: number) {}
}

/**
 * TODO:
 * @export
 * @class JetClient
 */
export class JetClient {
  /**
   * Creates an instance of JetClient.
   * @param {Program<Jet>} program
   * @param {boolean} [devnet]
   * @memberof JetClient
   */
  constructor(public program: Program<Jet>, public devnet?: boolean) {}

  /**
   * Create a new client for interacting with the Jet lending program.
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
   * @param {boolean} [devnet] Flag to determine if the connection is for devnet
   * @returns {Promise<JetClient>} The client
   * @memberof JetClient
   */
  static async connect(provider: Provider, devnet?: boolean): Promise<JetClient> {
    return new JetClient(new Program<Jet>(IDL as any, JET_ID, provider), devnet)
  }

  /**
   * Return all `Market` program accounts that have been created
   * @param {GetProgramAccountsFilter[]} [filter]
   * @returns {Promise<ProgramAccount<Market>[]>}
   * @memberof JetClient
   */
  async allMarkets(filter?: GetProgramAccountsFilter[]): Promise<ProgramAccount<Market>[]> {
    return this.program.account.market.all(filter)
  }

  /**
   * Return all `Obligation` program accounts that have been created
   * @param {GetProgramAccountsFilter[]} [filter]
   * @returns {Promise<ProgramAccount<Obligation>[]>}
   * @memberof JetClient
   */
  async allObligations(filter?: GetProgramAccountsFilter[]): Promise<ProgramAccount<Obligation>[]> {
    return (this.program.account.obligation as any).all(filter)
  }

  /**
   * Return all `Reserve` program accounts that have been created
   * @param {GetProgramAccountsFilter[]} [filter]
   * @returns {Promise<ProgramAccount<Reserve>[]>}
   * @memberof JetClient
   */
  async allReserves(filter?: GetProgramAccountsFilter[]): Promise<ProgramAccount<Reserve>[]> {
    return (this.program.account.reserve as any).all(filter)
  }

  /**
   * Decodes a buffer of account data into a usable
   * `Obligation` object.
   * @param {Buffer} b
   * @returns {Obligation}
   * @memberof JetClient
   */
  decodeObligation(b: Buffer): Obligation {
    return this.program.coder.accounts.decode<Obligation>("Obligation", b)
  }

  /**
   * Encodes the argued `Obligation` object into a `Buffer`.
   * @param {Obligation} o
   * @returns {Promise<Buffer>}
   * @memberof JetClient
   */
  encodeObligation(o: Obligation): Promise<Buffer> {
    return this.program.coder.accounts.encode<Obligation>("Obligation", o)
  }

  /**
   * Derive a PDA and associated bump nonce from
   * the argued list of seeds.
   * @param {DerivedAccountSeed[]} seeds
   * @returns {Promise<DerivedAccount>}
   * @memberof JetClient
   */
  async findDerivedAccount(seeds: DerivedAccountSeed[]): Promise<DerivedAccount> {
    const seedBytes = seeds.map(s => {
      if (typeof s == "string") {
        return Buffer.from(s)
      } else if ("publicKey" in s) {
        return s.publicKey.toBytes()
      } else if ("toBytes" in s) {
        return s.toBytes()
      } else {
        return s
      }
    })
    const [address, bumpSeed] = await PublicKey.findProgramAddress(
      seedBytes,
      this.program.programId
    )
    return new DerivedAccount(address, bumpSeed)
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

    await this.program.rpc.initMarket(
      params.owner,
      params.quoteCurrencyName,
      params.quoteCurrencyMint,
      {
        accounts: {
          market: account.publicKey
        },
        signers: [account],
        instructions: [await this.program.account.market.createInstruction(account)]
      }
    )

    return JetMarket.load(this, account.publicKey)
  }

  /**
   * Establish an event emitter subscription to the argued `Obligation`
   * account on-chain which listens for the "change" event from the publisher.
   * @param {Address} address
   * @param {web3.Commitment} [commitment]
   * @returns {(EventEmitter<string | symbol, any>)}
   * @memberof JetClient
   */
  subscribeToObligation(
    address: Address,
    commitment?: web3.Commitment
  ): EventEmitter<string | symbol, any> {
    return this.program.account.obligation.subscribe(address, commitment)
  }

  /**
   * Unsubscribes from the argued `Obligation` account
   * address on-chain.
   * @param {Address} address
   * @returns {Promise<void>}
   * @memberof JetClient
   */
  async unsubscribeFromObligation(address: Address): Promise<void> {
    return this.program.account.obligation.unsubscribe(address)
  }
}
