import { Program, Provider } from "@project-serum/anchor"
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import { connect, findDerivedAccount } from "../common"
import { PubkeyField } from "../common/accountParser"

export interface UserAuthentication {
  /** The relevant user address */
  owner: PublicKey

  /* Whether or not the authentication workflow for the user has already been completed. */
  complete: boolean

  /** Whether or not the user is allowed to access the facilities requiring the authentication workflow. */
  allowed: boolean
}

/** Class for interacting with the Jet Auth program */
export class Auth {
  /** Auth Program ID */
  static readonly PROGRAM_ID = new PublicKey("JPALXR88jy2fG3miuu4n3o8Jef4K2Cgc3Uypr3Y8RNX")
  /** Hardcoded address of the authority that can authenticate users */
  static readonly AUTHORITY = new PubkeyField("JPALXR88jy2fG3miuu4n3o8Jef4K2Cgc3Uypr3Y8RNX")

  static async deriveUserAuthentication(user: PublicKey) {
    return await findDerivedAccount(this.PROGRAM_ID, user)
  }

  static async connect(provider: Provider) {
    return await connect(provider, this.PROGRAM_ID)
  }

  static async loadUserAuth(authProgram: Program, user: PublicKey): Promise<UserAuthentication> {
    const { address: auth } = await this.deriveUserAuthentication(user)
    return (await authProgram.account.UserAuthentication.fetch(auth)) as UserAuthentication
  }

  /** Create a new account that can be used to identify that a
   * wallet/address is properly authenticated to perform protected actions. */
  static async createUserAuth(authProgram: Program, user: PublicKey, payer: PublicKey) {
    const { address: auth, bump } = await this.deriveUserAuthentication(user)
    return await authProgram.rpc.createUserAuth(bump, {
      accounts: {
        user,
        payer,
        auth,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /** Authenticate a user address. Auth.AUTHORITY must sign. */
  static async approveAuthentication(authProgram: Program, user: PublicKey) {
    const authority = (authProgram.provider.wallet as NodeWallet).payer

    return authProgram.rpc.authenticate({
      accounts: {
        auth: user,
        authority: authority.publicKey
      },
      signers: [authority]
    })
  }
}
