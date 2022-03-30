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

import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { GovClient } from "."

export interface GovRealmData {
  address: PublicKey
  /** External account with permission to modify realm */
  owner: PublicKey
  /** PDA that can sign on behalf of the realm */
  authority: PublicKey
  /** PDA token account that stores governance token */
  vault: PublicKey
}

export class GovRealm implements GovRealmData {
  /**
   * Creates an instance of GovRealm.
   * @private
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {PublicKey} owner
   * @param {PublicKey} authority
   * @param {PublicKey} vault
   * @memberof GovRealm
   */
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public owner: PublicKey,
    public authority: PublicKey,
    public vault: PublicKey
  ) {}

  /**
   * TODO:
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @returns {Promise<GovRealm>}
   * @memberof GovRealm
   */
  static async load(client: GovClient, address: PublicKey): Promise<GovRealm> {
    const data = await client.program.account.realm.fetch(address)
    return this.decode(client, address, data)
  }

  /**
   * TODO:
   * @memberof GovRealm
   */
  async refresh() {
    const realm = await GovRealm.load(this.client, this.address)
    this.address = realm.address
    this.owner = realm.owner
    this.authority = realm.authority
    this.vault = realm.vault
  }

  /**
   * TODO:
   * @private
   * @static
   * @param {GovClient} client
   * @param {PublicKey} address
   * @param {any} data
   * @returns {GovRealm}
   * @memberof GovRealm
   */
  private static decode(client: GovClient, address: PublicKey, data: any): GovRealm {
    return new GovRealm(client, address, data.owner, data.authority, data.vault)
  }

  // TODO: init_realm.rs - checked
  /**
   * Create the populated transaction instruction for `initRealm`.
   * @param {GovRealm} realm
   * @param {PublicKey} governanceTokenMint
   * @param {{ authority: number; vault: number }} bumpSeeds
   * @returns {Promise<TransactionInstruction>}
   * @memberof GovRealm
   */
  createRealmIx(
    realm: GovRealm,
    governanceTokenMint: PublicKey,
    bumpSeeds: { authority: number; vault: number }
  ): Promise<TransactionInstruction> {
    return this.client.program.methods
      .initRealm(bumpSeeds)
      .accounts({
        realm: realm.address,
        owner: realm.owner,
        authority: realm.authority,
        vault: realm.vault,
        governanceTokenMint: governanceTokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .instruction()
  }
}
