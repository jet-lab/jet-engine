import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token"
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { AssociatedToken } from "./associatedToken"
import { Address, BN, Provider, translateAddress } from "@project-serum/anchor"

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

  static async airdrop(
    provider: Provider,
    lamports: BN,
    mint: Address,
    owner: Address,
    faucet?: Address
  ): Promise<string> {
    const mintAddress = translateAddress(mint)
    const ownerAddress = translateAddress(owner)

    const ix: TransactionInstruction[] = []

    const destination = await AssociatedToken.load(provider.connection, mintAddress, ownerAddress)

    // Optionally create a token account for wallet
    if (!mintAddress.equals(NATIVE_MINT) && !destination.exists) {
      const createTokenAccountIx = createAssociatedTokenAccountInstruction(
        ownerAddress,
        destination.address,
        ownerAddress,
        mintAddress
      )
      ix.push(createTokenAccountIx)
    }

    if (mintAddress.equals(NATIVE_MINT)) {
      // Sol airdrop
      // Use a specific endpoint. A hack because some devnet endpoints are unable to airdrop
      const endpoint = new Connection("https://api.devnet.solana.com", Provider.defaultOptions().commitment)
      const airdropTxnId = await endpoint.requestAirdrop(ownerAddress, parseInt(lamports.toString()))
      await endpoint.confirmTransaction(airdropTxnId)
      return airdropTxnId
    } else if (faucet) {
      // Faucet airdrop
      await this.withAirdrop(ix, mintAddress, translateAddress(faucet), destination.address)
      return await provider.send(new Transaction().add(...ix))
    } else {
      // Mint to the destination token account
      const mintToIx = createMintToInstruction(
        mintAddress,
        destination.address,
        ownerAddress,
        BigInt(lamports.toString())
      )
      ix.push(mintToIx)
      return await provider.send(new Transaction().add(...ix))
    }
  }

  static async buildFaucetAirdropIx(
    amount: BN,
    tokenMintPublicKey: PublicKey,
    destinationAccountPubkey: PublicKey,
    faucetPubkey: PublicKey
  ) {
    const pubkeyNonce = await PublicKey.findProgramAddress([new TextEncoder().encode("faucet")], this.FAUCET_PROGRAM_ID)

    const keys = [
      { pubkey: pubkeyNonce[0], isSigner: false, isWritable: false },
      {
        pubkey: tokenMintPublicKey,
        isSigner: false,
        isWritable: true
      },
      { pubkey: destinationAccountPubkey, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: faucetPubkey, isSigner: false, isWritable: false }
    ]

    return new TransactionInstruction({
      programId: this.FAUCET_PROGRAM_ID,
      data: Buffer.from([1, ...amount.toArray("le", 8)]),
      keys
    })
  }
}
