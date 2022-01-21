import { Provider } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, AccountInfo as TokenAccountInfo } from "@solana/spl-token"
import { AccountInfo, PublicKey, Signer, TransactionInstruction } from "@solana/web3.js"
import { parseTokenAccount } from "./accountParser"

/**
 * Utility class to store a calculated PDA and
 * the bump nonce associated with it.
 * @export
 * @class DerivedAccount
 */
export class DerivedAccount {
  /**
   * Creates an instance of DerivedAccount.
   * @param {PublicKey} address
   * @param {number} bump
   * @memberof DerivedAccount
   */
  constructor(public address: PublicKey, public bump: number) {}
}

export class AssociatedToken {
  constructor(public address: PublicKey, public account: AccountInfo<Buffer>, public info: TokenAccountInfo) {
    return
  }

  static async withCreate(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey,
    mint: PublicKey
  ) {
    const tokenAddress = await this.getAssociatedTokenAddress(mint, owner)
    const tokenAccount = await this.load(provider, mint, owner)
    if (!tokenAccount) {
      const ix = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        tokenAddress.address,
        owner,
        provider.wallet.publicKey
      )
      instructions.push(ix)
    }
    return tokenAddress
  }

  static async withClose(
    instructions: TransactionInstruction[],
    owner: PublicKey,
    mint: PublicKey,
    destination: PublicKey,
    multiSigner: Signer[] = []
  ) {
    const tokenAddress = await this.getAssociatedTokenAddress(mint, owner)
    const ix = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      tokenAddress.address,
      destination,
      owner,
      multiSigner
    )
    instructions.push(ix)
  }

  static async load(provider: Provider, mint: PublicKey, owner: PublicKey) {
    const tokenAccount = await this.getAssociatedTokenAddress(mint, owner)
    const account = await provider.connection.getAccountInfo(tokenAccount.address)
    if (!account) {
      return undefined
    }
    const info = parseTokenAccount(account.data, tokenAccount.address)
    return new AssociatedToken(tokenAccount.address, account, info)
  }

  /**
   * Get the address for the associated token account
   *
   * @param mint Token mint account
   * @param owner Owner of the new account
   * @return Public key of the associated token account
   */
  static async getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): Promise<DerivedAccount> {
    const [address, bump] = await PublicKey.findProgramAddress(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    return new DerivedAccount(address, bump)
  }
}
