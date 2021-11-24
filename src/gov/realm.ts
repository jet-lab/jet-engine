import { PublicKey } from "@solana/web3.js";
import { GovClient } from ".";

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
  ) { }

  static async load(client: GovClient, address: PublicKey): Promise<GovRealm> {
    const data = await client.program.account.realm.fetch(address)
    return this.decode(client, address, data)
  }

  async refresh() {
    const proposal = await GovRealm.load(this.client, this.address)

    this.address = proposal.address
    this.owner = proposal.owner
    this.authority = proposal.authority
    this.vault = proposal.vault
  }

  private static decode(client: GovClient, address: PublicKey, data: any) {
    return new GovRealm(
      client,
      address,
      data.owner,
      data.authority,
      data.vault,
    )
  }
}