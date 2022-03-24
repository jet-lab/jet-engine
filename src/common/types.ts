import { PublicKey } from "@solana/web3.js"
import { BN } from "@project-serum/anchor"

/** Token account state as stored by the program */
export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2
}

/** Custom RawAccount with BN. Token account as stored by the program */
export interface RawTokenAccountInfo {
  mint: PublicKey
  owner: PublicKey
  amount: BN
  delegateOption: 1 | 0
  delegate: PublicKey
  state: AccountState
  isNativeOption: 1 | 0
  isNative: BN
  delegatedAmount: BN
  closeAuthorityOption: 1 | 0
  closeAuthority: PublicKey
}

/** Custom Account Interface with BN. Information about a token account*/
export interface JetTokenAccount {
  /** Address of the account */
  address: PublicKey
  /** Mint associated with the account */
  mint: PublicKey
  /** Owner of the account */
  owner: PublicKey
  /** Number of tokens the account holds */
  amount: BN
  /** Authority that can transfer tokens from the account */
  delegate: PublicKey | undefined
  /** Number of tokens the delegate is authorized to transfer */
  delegatedAmount: BN
  /** True if the account is initialized */
  isInitialized: boolean
  /** True if the account is frozen */
  isFrozen: boolean
  /** True if the account is a native token account */
  isNative: boolean
  /**
   * If the account is a native token account, it must be rent-exempt. The rent-exempt reserve is the amount that must
   * remain in the balance until the account is closed.
   */
  rentExemptReserve: BN
  /** Optional authority to close the account */
  closeAuthority: PublicKey | undefined
}

/** Custom Mint Interface with BN. Information about a mint */
export interface JetMint {
  /** Address of the mint */
  address: PublicKey
  /**
   * Optional authority used to mint new tokens. The mint authority may only be provided during mint creation.
   * If no mint authority is present then the mint has a fixed supply and no further tokens may be minted.
   */
  mintAuthority: PublicKey | undefined
  /** Total supply of tokens */
  supply: BN
  /** Number of base 10 digits to the right of the decimal place */
  decimals: number
  /** Is this mint initialized */
  isInitialized: boolean
  /** Optional authority to freeze token accounts */
  freezeAuthority: PublicKey | undefined
}

/** Custom RawMint Interface with BN. Mint as stored by the program */
export interface RawMint {
  mintAuthorityOption: 1 | 0
  mintAuthority: PublicKey
  supply: BN
  decimals: number
  isInitialized: boolean
  freezeAuthorityOption: 1 | 0
  freezeAuthority: PublicKey
}
