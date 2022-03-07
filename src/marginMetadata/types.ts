import { PublicKey } from '@solana/web3.js';

export interface TokenMetadata {
  tokenMint: PublicKey
  pythPrice: PublicKey
  pythProduct: PublicKey
}
