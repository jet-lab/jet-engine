import { Provider, BN } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  createSyncNativeInstruction
} from "@solana/spl-token"
import {
  AccountInfo,
  Connection,
  PublicKey,
  TransactionInstruction,
  ParsedAccountData,
  SystemProgram
} from "@solana/web3.js"
import { useMemo } from "react"
import { parseMintAccount, parseTokenAccount } from "./accountParser"
import { Hooks } from "./hooks"
import { findDerivedAccount, bnToNumber } from "."
import { JetTokenAccount, JetMint } from "./types"

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

  /** TODO:
   * Get mint info
   * @static
   * @param {Provider} connection
   * @param {PublicKey} mint
   * @returns {(Promise<Mint | undefined>)}
   * @memberof AssociatedToken
   */
  static async loadMint(connection: Connection, mint: PublicKey): Promise<JetMint | undefined> {
    const mintInfo = await connection.getAccountInfo(mint)
    if (!mintInfo) {
      return undefined
    }
    return parseMintAccount(mintInfo.data, mint)
  }

  /**
   * Creates an instance of AssociatedToken.
   * @param {PublicKey} address
   * @param {AccountInfo<Buffer>} account
   * @param {JetTokenAccount} info
   * @memberof AssociatedToken
   */
  constructor(public account: AccountInfo<Buffer | ParsedAccountData>, public info: JetTokenAccount) {
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
    }, [mint?.toBase58(), owner?.toBase58()])
  }

  /**
   * Use an aux token account by address. Aux token accounts are not associated account PDA
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [tokenAddress]
   * @returns {(JetTokenAccount | undefined)}
   * @memberof AssociatedToken
   */
  static useAux(connection: Connection | undefined, tokenAddress: PublicKey | undefined): AssociatedToken | undefined {
    return Hooks.usePromise(
      async () => connection && tokenAddress && AssociatedToken.loadAux(connection, tokenAddress),
      [connection, tokenAddress?.toBase58()]
    )
  }

  /**
   * Use an associated token account
   * @static
   * @param {Provider} [provider]
   * @param {PublicKey} [mint]
   * @param {(PublicKey | null)} [owner]
   * @returns {(JetTokenAccount | undefined)}
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
   * @returns {(Mint | undefined)}
   * @memberof AssociatedToken
   */
  static useMint(connection: Connection | undefined, address: PublicKey | undefined): JetMint | undefined {
    return Hooks.usePromise(
      async () => connection && address && AssociatedToken.loadMint(connection, address),
      [connection, address?.toBase58()]
    )
  }

  /**
   * If the associated token account does not exist for this mint, add instruction to create the token account.If ATA exists, do nothing.
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {Provider} provider
   * @param {PublicKey} owner
   * @param {PublicKey} mint
   * @returns {Promise<PublicKey>} returns the public key of the token account
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
      const ix = createAssociatedTokenAccountInstruction(provider.wallet.publicKey, tokenAddress, owner, mint)
      instructions.push(ix)
    }
    return tokenAddress
  }

  /**
   * Add close associated token account IX
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
    rentDestination: PublicKey
  ) {
    const tokenAddress = this.derive(mint, owner)
    const ix = createCloseAccountInstruction(tokenAddress, rentDestination, owner)
    instructions.push(ix)
  }

  /** Add wrap SOL IX
   * @param instructions
   * @param provider
   * @param owner
   * @param mint
   * @param amount
   */
  static async withWrapIfNativeMint(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey,
    mint: PublicKey,
    amount: BN
  ): Promise<void> {
    //only run if mint is wrapped sol mint
    if (mint.equals(NATIVE_MINT)) {
      //this will add instructions to create ata if ata does not exist, if exist, we will get the ata address
      const ata = await this.withCreate(instructions, provider, owner, mint)
      //IX to transfer sol to ATA
      const transferIx = SystemProgram.transfer({
        fromPubkey: owner,
        lamports: bnToNumber(amount),
        toPubkey: ata
      })
      const syncNativeIX = createSyncNativeInstruction(ata)
      instructions.push(transferIx, syncNativeIX)
    }
  }

  /**
   * add unWrap SOL IX
   * @param {TransactionInstruction[]} instructions
   * @param {Provider} provider
   * @param {owner} owner
   * @param {tokenAccount} tokenAccount
   * @param {mint} mint
   * @param {amount} amount
   */
  static async withUnwrapIfNative(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey, //user pubkey
    tokenAccount: PublicKey,
    mint: PublicKey,
    amount: BN
  ): Promise<void> {
    if (mint.equals(NATIVE_MINT)) {
      //create a new ata if ata doesn't not exist
      const ata = await this.withCreate(instructions, provider, owner, mint)
      //IX to transfer wSOL to ATA
      const transferIx = createTransferInstruction(tokenAccount, ata, owner, BigInt(amount.toString()))
      //add transfer IX
      instructions.push(transferIx)
      //add close account IX
      await this.withClose(instructions, owner, mint, owner)
    }
  }
}
