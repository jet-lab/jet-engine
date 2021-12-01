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
  private constructor(
    private client: GovClient,
    public address: PublicKey,
    public owner: PublicKey,
    public authority: PublicKey,
    public vault: PublicKey
  ) {}

  static async load(client: GovClient, address: PublicKey): Promise<GovRealm> {
    const data = await client.program.account.realm.fetch(address)
    return this.decode(client, address, data)
  }

  async refresh() {
    const realm = await GovRealm.load(this.client, this.address)

    this.address = realm.address
    this.owner = realm.owner
    this.authority = realm.authority
    this.vault = realm.vault
  }

  private static decode(client: GovClient, address: PublicKey, data: any) {
    return new GovRealm(client, address, data.owner, data.authority, data.vault)
  }

  // TODO: init_realm.rs - checked
  /**
   * Create the populated transaction instruction for `initRealm`.
   * @param {GovRealm} realm
   * @param {PublicKey} governanceTokenMint
   * @param {{ authority: number; vault: number }} bumpSeeds
   * @returns {TransactionInstruction}
   * @memberof GovRealm
   */
  createRealmIx(realm: GovRealm, governanceTokenMint: PublicKey, bumpSeeds: { authority: number; vault: number }): TransactionInstruction {
    return this.client.program.instruction.initRealm(bumpSeeds, {
      accounts: {
        realm: realm.address,
        owner: realm.owner,
        authority: realm.authority,
        vault: realm.vault,  
        governanceTokenMint: governanceTokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    })
  }
}
