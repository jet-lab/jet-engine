import { Provider } from "@project-serum/anchor"
import { TOKEN_PROGRAM_ID } from "@project-serum/serum/lib/token-instructions"
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token"
import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { DerivedAccount } from ".."

export class AssociatedToken {
  private constructor() {
    return
  }

  static async withCreateAssociatedToken(
    instructions: TransactionInstruction[],
    provider: Provider,
    owner: PublicKey,
    mint: PublicKey
  ) {
    const associatedAccount = await this.getAssociatedTokenAddress(mint, owner)
    const info = await provider.connection.getAccountInfo(associatedAccount.address)
    if (!info) {
      const ix = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        associatedAccount.address,
        owner,
        provider.wallet.publicKey
      )
      instructions.push(ix)
    }
    return associatedAccount
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
