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

import { PublicKey, Keypair } from "@solana/web3.js"
import { Program, Provider } from "@project-serum/anchor"
import { Jet } from "./idl/jet"
import IDL from "./idl/jet.json"
import { CreateMarketParams, JetMarket } from "./market"
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
}
