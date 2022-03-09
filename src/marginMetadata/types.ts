import { PublicKey } from "@solana/web3.js"

export interface TokenMetadataInfo {
  tokenMint: PublicKey
  pythPrice: PublicKey
  pythProduct: PublicKey
}
