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

import { PublicKey, GetProgramAccountsFilter } from "@solana/web3.js"
import { Program, Provider, ProgramAccount } from "@project-serum/anchor"
import { Jet } from "./idl"
import { ObligationAccount } from "./types"
import { JET_ID } from "."
import { PositionInfoStructList } from "./layout"
import { parsePosition } from "./util"

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
  private static OBLIGATION_ACCOUNT_NAME = "Obligation"

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
    const idl = await Program.fetchIdl(JET_ID, provider)
    return new JetClient(new Program<Jet>(idl as Jet, JET_ID, provider), devnet)
  }

  /**
   * Return all `Obligation` program accounts that have been created
   * @param {GetProgramAccountsFilter[]} [filters]
   * @returns {Promise<ProgramAccount<Obligation>[]>}
   * @memberof JetClient
   */
  async allObligations(filters?: GetProgramAccountsFilter[]): Promise<ProgramAccount<ObligationAccount>[]> {
    return (this.program.account.obligation as any).all(filters)
  }

  /**
   * Decodes a buffer of account data into a usable
   * `Obligation` object.
   * @param {Buffer} b
   * @returns {ObligationAccount}
   * @memberof JetClient
   */
  decodeObligation(b: Buffer): ObligationAccount {
    const o = this.program.coder.accounts.decode<ObligationAccount>(JetClient.OBLIGATION_ACCOUNT_NAME, b)
    o.loans = PositionInfoStructList.decode(Buffer.from(o.loans as any as number[])).map(parsePosition)
    o.collateral = PositionInfoStructList.decode(Buffer.from(o.collateral as any as number[])).map(parsePosition)
    return o
  }

  /**
   * Encodes the argued `Obligation` object into a `Buffer`.
   * @param {ObligationAccount} o
   * @returns {Promise<Buffer>}
   * @memberof JetClient
   */
  encodeObligation(o: ObligationAccount): Promise<Buffer> {
    return this.program.coder.accounts.encode<ObligationAccount>(JetClient.OBLIGATION_ACCOUNT_NAME, o)
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
    const [address, bumpSeed] = await PublicKey.findProgramAddress(seedBytes, this.program.programId)
    return new DerivedAccount(address, bumpSeed)
  }
}
