import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import BN from "bn.js"
import { AssociatedToken } from "./associatedToken"
import type { JetReserve } from "../pools/reserve"

export class Airdrop {
  static readonly FAUCET_PROGRAM_ID = new PublicKey("4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt")

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

  static async airdropToken(reserve: JetReserve, faucet: PublicKey, user: PublicKey) {
    const instructions: TransactionInstruction[] = []

    // Check for user token account
    // If it doesn't exist add instructions to create it
    const associatedAccount = await AssociatedToken.withCreateAssociatedToken(
      instructions,
      reserve.client.program.provider,
      user,
      reserve.data.tokenMint
    )

    // Create airdrop instructions
    await this.withAirdrop(instructions, reserve.data.tokenMint, faucet, associatedAccount.address)

    // Execute airdrop
    return await reserve.client.program.provider.send(new Transaction().add(...instructions))
  }
}
