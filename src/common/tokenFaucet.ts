import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { AssociatedToken } from "./associatedToken"
import { Provider } from "@project-serum/anchor"

export class TokenFaucet {
  /**
   * Airdrop faucet program public key.
   * @static
   * @memberof TokenFaucet
   */
  static readonly FAUCET_PROGRAM_ID = new PublicKey("4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt")

  /**
   * TODO:
   * @private
   * @static
   * @param {TransactionInstruction[]} instructions
   * @param {PublicKey} tokenMint
   * @param {PublicKey} tokenFaucet
   * @param {PublicKey} tokenAccount
   * @memberof TokenFaucet
   */
  private static async withAirdrop(
    instructions: TransactionInstruction[],
    tokenMint: PublicKey,
    tokenFaucet: PublicKey,
    tokenAccount: PublicKey
  ) {
    const pubkeyNonce = await PublicKey.findProgramAddress([Buffer.from("faucet", "utf8")], this.FAUCET_PROGRAM_ID)

    const keys = [
      { pubkey: pubkeyNonce[0], isSigner: false, isWritable: false },
      {
        pubkey: tokenMint,
        isSigner: false,
        isWritable: true
      },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tokenFaucet, isSigner: false, isWritable: false }
    ]

    const faucetIx = new TransactionInstruction({
      programId: this.FAUCET_PROGRAM_ID,
      data: Buffer.from([1, ...new BN(10000000000000).toArray("le", 8)]),
      keys
    })

    instructions.push(faucetIx)
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @param {PublicKey} faucet
   * @param {PublicKey} user
   * @param {PublicKey} mint
   * @returns {Promise<string>}
   * @memberof TokenFaucet
   */
  static async airdropToken(provider: Provider, faucet: PublicKey, user: PublicKey, mint: PublicKey): Promise<string> {
    const instructions: TransactionInstruction[] = []

    // Check for user token account
    // If it doesn't exist add instructions to create it
    const address = await AssociatedToken.withCreate(instructions, provider, user, mint)

    // Create airdrop instructions
    await this.withAirdrop(instructions, mint, faucet, address)

    // Execute airdrop
    return provider.send(new Transaction().add(...instructions))
  }
}
