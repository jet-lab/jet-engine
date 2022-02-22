import { Provider } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, AccountInfo as TokenAccountInfo, MintInfo } from "@solana/spl-token"
import { AccountInfo, Connection, PublicKey, Signer, TransactionInstruction, ParsedAccountData } from "@solana/web3.js"
import { useMemo } from "react"
import { parseMintAccount, parseTokenAccount } from "./accountParser"
import { Hooks } from "./hooks"
import { findDerivedAccount } from "."

//ADD wrapping and unwrapping SOL
export class AssociatedToken {
  address: PublicKey
  /**
   * Get the address for the associated token account
   * @static
   * @param {PublicKey} mint Token mint account
   * @param {PublicKey} owner Owner of the new account
   * @returns {Promise<PublicKey>} Public key of the associated token account
   * @memberof AssociatedToken
   */
  static derive(mint: PublicKey, owner: PublicKey): PublicKey {
    return findDerivedAccount(ASSOCIATED_TOKEN_PROGRAM_ID, owner, TOKEN_PROGRAM_ID, mint)
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @param {PublicKey} mint
   * @param {PublicKey} owner
   * @returns {(Promise<AssociatedToken | undefined>)}
   * @memberof AssociatedToken
   */
  static async load(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<AssociatedToken | undefined> {
    const address = this.derive(mint, owner)
    const token = await this.loadAux(connection, address)
    if (token && !token.info.owner.equals(owner)) {
      throw new Error("Unexpected owner of the associated token")
    }
    return token
  }

  static async loadAux(connection: Connection, address: PublicKey) {
    const account = await connection.getAccountInfo(address)
    if (!account) {
      return undefined
    }
    const info = parseTokenAccount(account.data, address)
    return new AssociatedToken(account, info)
  }

  static async loadMultipleAux(
    connection: Connection,
    addresses: PublicKey[]
  ): Promise<(AssociatedToken | undefined)[]> {
    const accounts = await connection.getMultipleAccountsInfo(addresses)
    return accounts.map((account, i) => {
      if (!account) {
        return undefined
      }
      //TODO - FIXME cast it as any for now
      const info = parseTokenAccount(account.data as any, addresses[i])
      return new AssociatedToken(account, info)
    })
  }

  /**
   * TODO:
   * @static
   * @param {Provider} connection
   * @param {PublicKey} mint
   * @returns {(Promise<MintInfo | undefined>)}
   * @memberof AssociatedToken
   */
  static async loadMint(connection: Connection, mint: PublicKey): Promise<MintInfo | undefined> {
    const mintInfo = await connection.getAccountInfo(mint)
    if (!mintInfo) {
      return undefined
    }
    return parseMintAccount(mintInfo.data)
  }

  /**
   * Creates an instance of AssociatedToken.
   * @param {PublicKey} address
   * @param {AccountInfo<Buffer>} account
   * @param {TokenAccountInfo} info
   * @memberof AssociatedToken
   */
  constructor(public account: AccountInfo<Buffer | ParsedAccountData>, public info: TokenAccountInfo) {
    this.address = info.address
  }

  /**
   * Use an associated token account address
   * @static
   * @param {PublicKey} [mint]
   * @param {(PublicKey | null)} [owner]
   * @returns {(PublicKey | undefined)}
   * @memberof AssociatedToken
   */
  static useAddress(mint: PublicKey | undefined, owner: PublicKey | undefined): PublicKey | undefined {
    return useMemo(() => {
      if (!mint || !owner) {
        return undefined
      }
      return this.derive(mint, owner)
    }, [mint, owner])
  }

  /**
   * Use an aux token account by address. Aux token accounts are not associated account PDA
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [tokenAddress]
   * @returns {(TokenAccountInfo | undefined)}
   * @memberof AssociatedToken
   */
  static useAux(connection: Connection | undefined, tokenAddress: PublicKey | undefined): AssociatedToken | undefined {
    return Hooks.usePromise(
      async () => connection && tokenAddress && AssociatedToken.loadAux(connection, tokenAddress),
      [connection, tokenAddress]
    )
  }

  /**
   * Use an associated token account
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [mint]
   * @param {(PublicKey | null)} [owner]
   * @returns {(TokenAccountInfo | undefined)}
   * @memberof AssociatedToken
   */
  static use(
    connection: Connection | undefined,
    mint: PublicKey | undefined,
    owner: PublicKey | undefined
  ): AssociatedToken | undefined {
    const tokenAddress = this.useAddress(mint, owner)
    const tokenAccount = this.useAux(connection, tokenAddress)
    return tokenAccount
  }

  /**
   * Use a specified token mint.
   * @static
   * @param {Provider} [connection]
   * @param {PublicKey} [address]
   * @returns {(MintInfo | undefined)}
   * @memberof AssociatedToken
   */
  static useMint(connection: Connection | undefined, address: PublicKey | undefined): MintInfo | undefined {
    return Hooks.usePromise(
      async () => connection && address && AssociatedToken.loadMint(connection, address),
      [connection, address]
    )
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Provider} provider
   * @param {PublicKey} owner
   * @param {PublicKey} mint
   * @returns {Promise<PublicKey>}
   * @memberof AssociatedToken
   */
  static async withCreate(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    const tokenAddress = this.derive(mint, owner)
    const tokenAccount = await this.load(provider.connection, mint, owner)
    if (!tokenAccount) {
      const ix = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        tokenAddress,
        owner,
        provider.wallet.publicKey
      )
      instructions.push(ix)
    }
    return tokenAddress
  }

  /**
   * TODO:
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {PublicKey} owner
   * @param {PublicKey} mint
   * @param {PublicKey} rentDestination
   * @param {Signer[]} [multiSigner=[]]
   * @memberof AssociatedToken
   */
  static async withClose(
    instructions: TransactionInstruction[],
    owner: PublicKey,
    mint: PublicKey,
    rentDestination: PublicKey,
    multiSigner: Signer[] = []
  ) {
    const tokenAddress = this.derive(mint, owner)
    const ix = Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, tokenAddress, rentDestination, owner, multiSigner)
    instructions.push(ix)
  }
}
