import { Provider, BN } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import { struct, u8 } from "@solana/buffer-layout"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  AccountInfo as TokenAccountInfo,
  MintInfo,
  NATIVE_MINT
} from "@solana/spl-token"
import {
  AccountInfo,
  Connection,
  PublicKey,
  Signer,
  TransactionInstruction,
  ParsedAccountData,
  SystemProgram
} from "@solana/web3.js"
import { useMemo } from "react"
import { parseMintAccount, parseTokenAccount } from "./accountParser"
import { Hooks } from "./hooks"
import { findDerivedAccount, bnToNumber } from "."

/** Instructions defined by the program */
enum TokenInstruction {
  InitializeMint = 0,
  InitializeAccount = 1,
  InitializeMultisig = 2,
  Transfer = 3,
  Approve = 4,
  Revoke = 5,
  SetAuthority = 6,
  MintTo = 7,
  Burn = 8,
  CloseAccount = 9,
  FreezeAccount = 10,
  ThawAccount = 11,
  TransferChecked = 12,
  ApproveChecked = 13,
  MintToChecked = 14,
  BurnChecked = 15,
  InitializeAccount2 = 16,
  SyncNative = 17,
  InitializeAccount3 = 18,
  InitializeMultisig2 = 19,
  InitializeMint2 = 20
}

const syncNativeInstructionData = struct([u8("instruction")])

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
   * Get mint info
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
    }, [mint?.toBase58(), owner?.toBase58()])
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
      [connection, tokenAddress?.toBase58()]
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
    rentDestination: PublicKey,
    multiSigner: Signer[] = []
  ) {
    const tokenAddress = this.derive(mint, owner)
    const ix = Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, tokenAddress, rentDestination, owner, multiSigner)
    instructions.push(ix)
  }
  /**
   * Add SyncNative instruction
   * @param {TransactionInstructions} instructions
   * @param {PublicKey} account
   * @param programId
   */
  static withCreateSyncNativeInstruction(
    instructions: TransactionInstruction[],
    account: PublicKey,
    programId = TOKEN_PROGRAM_ID
  ): void {
    const keys = [{ pubkey: account, isSigner: false, isWritable: true }]

    const data = Buffer.alloc(syncNativeInstructionData.span)
    syncNativeInstructionData.encode({ instruction: TokenInstruction.SyncNative }, data)

    instructions.push(new TransactionInstruction({ keys, programId, data }))
  }

  /** Add IX for wrapping SOL
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
  ) {
    //only run if mint is wrapped sol mint
    if (mint.equals(NATIVE_MINT)) {
      //this will add instructions to create ata if ata does not exist, if exist, we will get the ata address
      const ata = await this.withCreate(instructions, provider, owner, mint)
      //IX to transfer sol to ATA
      const transferIx = SystemProgram.transfer({
        fromPubkey: owner,
        //parse BN
        lamports: bnToNumber(amount),
        toPubkey: ata
      })
      instructions.push(transferIx)
      //IX to sync wrapped SOL balance
      this.withCreateSyncNativeInstruction(instructions, ata)
    }
  }
}
