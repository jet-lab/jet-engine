import { Idl, Program, Provider } from "@project-serum/anchor"
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet"
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { useEffect, useState } from "react"
import { connect, findDerivedAccount } from "../common"
import { PubkeyField } from "../common/accountParser"
import { Hooks } from "../common/hooks"

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

  /**
   * Dervices the user authentication account from the argued public key.
   * @static
   * @param {PublicKey} user
   * @returns {Promise<PublicKey>}
   * @memberof Auth
   */
  static deriveUserAuthentication(user: PublicKey): PublicKey {
    return findDerivedAccount(Auth.PROGRAM_ID, user)
  }

  /**
   * Creates a connection to the authentication program.
   * @static
   * @param {Provider} provider
   * @returns {Promise<Program<Idl>>}
   * @memberof Auth
   */
  static connect(provider: Provider): Promise<Program<Idl>> {
    return connect(Auth.PROGRAM_ID, provider)
  }

  /**
   * Creates an instance of Auth.
   * @param {UserAuthentication} userAuthentication
   * @param {PublicKey} address
   * @memberof Auth
   */
  constructor(public userAuthentication: UserAuthentication, public address: PublicKey) {}

  /**
   * Load and return the user authentication account from the argued public key.
   * @static
   * @param {Program} authProgram
   * @param {PublicKey} user
   * @returns {Promise<Auth>}
   * @memberof Auth
   */
  static async loadUserAuth(authProgram: Program, user: PublicKey): Promise<Auth> {
    const address = this.deriveUserAuthentication(user)
    const userAuthentication = (await authProgram.account.userAuthentication.fetch(address)) as UserAuthentication
    return new Auth(userAuthentication, address)
  }

  /**
   * Custom React hook to use the authentication program as state.
   * @static
   * @param {Provider} provider
   * @returns {(Program<Idl> | undefined)}
   * @memberof Auth
   */
  static useAuthProgram(provider: Provider): Program<Idl> | undefined {
    return Hooks.usePromise(async () => Auth.connect(provider), [provider])
  }

  /**
   * Load the user authentication account. The account will be fetched every 2 seconds until it has been authenticated.
   * @static
   * @param {Program} [authProgram]
   * @param {(PublicKey | null)} [wallet]
   * @returns {{ authAccount?: UserAuthentication; loading: boolean }}
   * @memberof Auth
   */
  static useAuthAccount(authProgram?: Program, wallet?: PublicKey | null): { authAccount?: Auth; loading: boolean } {
    const [{ authAccount, loading }, setAuthAccount] = useState<{
      authAccount: Auth | undefined
      loading: boolean
    }>({
      authAccount: undefined,
      loading: true
    })

    useEffect(() => {
      let abort = false
      const interval = setInterval(() => {
        if (!wallet || !authProgram) {
          setAuthAccount({ authAccount: undefined, loading: true })
          return
        }
        if (authAccount && authAccount.userAuthentication.complete) {
          clearInterval(interval)
          return
        }

        Auth.loadUserAuth(authProgram, wallet)
          .then(newAccount => {
            if (!abort) {
              setAuthAccount({ authAccount: newAccount, loading: false })
            }
          })
          .catch(() => {
            setAuthAccount({ authAccount: undefined, loading: false })
          })
      }, 1000)

      return () => {
        abort = true
        clearInterval(interval)
      }
    }, [wallet?.toBase58(), authProgram, authAccount])

    return { authAccount, loading }
  }

  /**
   * Create a new account that can be used to identify that a
   * wallet/address is properly authenticated to perform protected actions.
   * @static
   * @param {Program} authProgram
   * @param {PublicKey} user
   * @param {PublicKey} payer
   * @returns {Promise<Transaction>}
   * @memberof Auth
   */
  static async createUserAuth(authProgram: Program, user: PublicKey, payer: PublicKey): Promise<Transaction> {
    const auth = this.deriveUserAuthentication(user)
    return authProgram.transaction.createUserAuth({
      accounts: {
        user,
        payer,
        auth,
        systemProgram: SystemProgram.programId
      }
    })
  }

  /**
   * Authenticate a user address. Auth.AUTHORITY must sign.
   * @static
   * @param {Program} authProgram
   * @param {PublicKey} user
   * @returns {Transaction}
   * @memberof Auth
   */
  static approveAuthentication(authProgram: Program, user: PublicKey): Transaction {
    const authority = (authProgram.provider.wallet as NodeWallet).payer

    return authProgram.transaction.authenticate({
      accounts: {
        auth: user,
        authority: authority.publicKey
      },
      signers: [authority]
    })
  }
}
