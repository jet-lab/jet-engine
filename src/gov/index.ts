import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"

const JET_GOV_PROGRAM_ID = new PublicKey("5TBwvU5xoA13fzmZgWVgFBUmBz1YCdiq2AshDZpPn3AL") // FIXME: deploy program

export const StaticSeed = {
  RealmAuthority: Buffer.from("realm-authority"),
  Vault: Buffer.from("vault"),
  Voter: Buffer.from("voter")
}

export class GovClient {
  constructor(public program: Program) {}

  static async connect(provider: Provider): Promise<GovClient> {
    const idl = await Program.fetchIdl(JET_GOV_PROGRAM_ID, provider)
    return new GovClient(new Program(idl as any, JET_GOV_PROGRAM_ID))
  }

  async deriveRealmAuthority(realm: PublicKey) {
    return await PublicKey.findProgramAddress([StaticSeed.RealmAuthority, realm.toBuffer()], this.program.programId)
  }

  async deriveVault(realm: PublicKey) {
    return await PublicKey.findProgramAddress([StaticSeed.Vault, realm.toBuffer()], this.program.programId)
  }

  async deriveVoter(realm: PublicKey, wallet: PublicKey) {
    return await PublicKey.findProgramAddress(
      [StaticSeed.Voter, wallet.toBuffer(), realm.toBuffer()],
      this.program.programId
    )
  }
}
