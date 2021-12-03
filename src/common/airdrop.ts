import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js"
import BN from 'bn.js'

export const FAUCET_PROGRAM_ID = new PublicKey('4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt');

export const makeAirdropTx = async (tokenMint: PublicKey, tokenFaucet: PublicKey, user: PublicKey, connection: Connection) => {
  const tokenAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenMint,
    user
  );

  const tokenInfo = await connection.getAccountInfo(tokenAddress);

  let createAccountIx: TransactionInstruction | undefined
  if (tokenInfo === null) {
    createAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      tokenAddress,
      user,
      user
    )
  }

  const pubkeyNonce = await PublicKey.findProgramAddress([Buffer.from("faucet", 'utf8')], FAUCET_PROGRAM_ID)

  const keys = [
    { pubkey: pubkeyNonce[0], isSigner: false, isWritable: false },
    {
      pubkey: tokenMint,
      isSigner: false,
      isWritable: true
    },
    { pubkey: tokenAddress, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: tokenFaucet, isSigner: false, isWritable: false }
  ]

  const faucetIx = new TransactionInstruction({
    programId: FAUCET_PROGRAM_ID,
    data: Buffer.from([1, ...new BN(10000000000000).toArray("le", 8)]),
    keys
  })

  return [createAccountIx, faucetIx].filter(ix => ix) as TransactionInstruction[];
}
