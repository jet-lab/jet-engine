import { Provider, BN, Address, translateAddress } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  createSyncNativeInstruction,
  Mint,
  Account
} from "@solana/spl-token"
import { Connection, PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import { useMemo } from "react"
import { parseMintAccount, parseTokenAccount } from "./accountParser"
import { Hooks } from "./hooks"
import { findDerivedAccount, bnToNumber } from "."
import { TokenAmount } from "./tokenAmount"

export class AssociatedToken {
  exists: boolean
  /**
   * Get the address for the associated token account
   * @static
   * @param {Address} mint Token mint account
   * @param {Address} owner Owner of the new account
   * @returns {Promise<PublicKey>} Public key of the associated token account
   * @memberof AssociatedToken
   */
  static derive(mint: Address, owner: Address): PublicKey {
    const mintAddress = translateAddress(mint)
    const ownerAddress = translateAddress(owner)
    return findDerivedAccount(ASSOCIATED_TOKEN_PROGRAM_ID, ownerAddress, TOKEN_PROGRAM_ID, mintAddress)
  }

  /**
   * TODO:
   * @static
   * @param {Connection} connection
   * @param {Address} mint
   * @param {Address} owner
   * @param {number} decimals
   * @returns {(Promise<AssociatedToken>)}
   * @memberof AssociatedToken
   */
  static async load(
    connection: Connection,
    mint: Address,
    owner: Address,
    decimals?: number
  ): Promise<AssociatedToken> {
    const mintAddress = translateAddress(mint)
    const ownerAddress = translateAddress(owner)
    const address = this.derive(mintAddress, ownerAddress)
    const token = await this.loadAux(connection, address, decimals)
    if (token.info && !token.info.owner.equals(ownerAddress)) {
      throw new Error("Unexpected owner of the associated token")
    }
    return token
  }

  static async loadAux(connection: Connection, address: Address, decimals?: number) {
    const pubkey = translateAddress(address)
    const account = await connection.getAccountInfo(pubkey)
    let info: Account | null, amount: TokenAmount
    if (account) {
      info = parseTokenAccount(account, pubkey)
      if (decimals === undefined) {
        const mint = await this.loadMint(connection, info.mint)
        if (!mint) {
          throw new Error(`Invalid mint for account ${pubkey.toBase58()}`)
        }
        decimals = mint.decimals
      }
      amount = TokenAmount.tokenAccount(info, decimals)
    } else {
      info = null
      amount = TokenAmount.zero(decimals ?? 0)
    }
    return new AssociatedToken(pubkey, info, amount)
  }

  static zero(mint: Address, owner: Address, decimals: number) {
    const address = this.derive(mint, owner)
    return this.zeroAux(address, decimals)
  }

  static zeroAux(address: Address, decimals: number) {
    const pubkey = translateAddress(address)
    const info = null
    const amount = TokenAmount.zero(decimals)
    return new AssociatedToken(pubkey, info, amount)
  }

  static async loadMultiple(
    connection: Connection,
    mints: Address[],
    decimals: number | number[],
    owners: Address | Address[]
  ): Promise<AssociatedToken[]> {
    if (Array.isArray(owners) && owners.length !== mints.length) {
      throw new Error("Owners array length does not equal mints array length")
    }
    if (Array.isArray(decimals) && decimals.length !== mints.length) {
      throw new Error("Decimals array length does not equal mints array length")
    }

    const addresses: PublicKey[] = []
    for (let i = 0; i < mints.length; i++) {
      const mint = mints[i]
      const owner = Array.isArray(owners) ? owners[i] : owners
      addresses.push(AssociatedToken.derive(mint, owner))
    }

    return await this.loadMultipleAux(connection, addresses, decimals)
  }

  static async loadMultipleAux(
    connection: Connection,
    addresses: Address[],
    decimals: number | number[]
  ): Promise<AssociatedToken[]> {
    if (Array.isArray(decimals) && decimals.length !== addresses.length) {
      throw new Error("Decimals array length does not equal addresses array length")
    }

    const pubkeys = addresses.map(address => translateAddress(address))

    const accounts = await connection.getMultipleAccountsInfo(pubkeys)
    return accounts.map((account, i) => {
      const pubkey = pubkeys[i]
      const decimal = Array.isArray(decimals) ? decimals[i] : decimals
      const info = account ? parseTokenAccount(account, pubkeys[i]) : null
      const amount = info ? TokenAmount.tokenAccount(info, decimal) : TokenAmount.zero(decimal)
      return new AssociatedToken(pubkey, info, amount)
    })
  }

  /** TODO:
   * Get mint info
   * @static
   * @param {Provider} connection
   * @param {Address} mint
   * @returns {(Promise<Mint | undefined>)}
   * @memberof AssociatedToken
   */
  static async loadMint(connection: Connection, mint: Address): Promise<Mint | undefined> {
    const mintAddress = translateAddress(mint)
    const mintInfo = await connection.getAccountInfo(mintAddress)
    if (!mintInfo) {
      return undefined
    }
    return parseMintAccount(mintInfo, mintAddress)
  }

  /**
   * Creates an instance of AssociatedToken.
   *
   * @param {PublicKey} address
   * @param {Account | null} info
   * @param {TokenAmount} amount
   * @memberof AssociatedToken
   */
  constructor(public address: PublicKey, public info: Account | null, public amount: TokenAmount) {
    this.exists = !!info
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
  static useMint(connection: Connection | undefined, address: PublicKey | undefined): Mint | undefined {
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
