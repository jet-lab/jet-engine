import { BN } from "@project-serum/anchor"
import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"
import { PublicKey } from "@solana/web3.js"
import { JetMarginPoolIdl } from ".."

export type MarginPoolData = TypeDef<AllAccountsMap<JetMarginPoolIdl>["marginPool"], IdlTypes<JetMarginPoolIdl>>
export type MarginPoolConfigData = MarginPoolData["config"]
export type MarginPoolOracleData = TypeDef<
  AllAccountsMap<JetMarginPoolIdl>["marginPoolOracle"],
  IdlTypes<JetMarginPoolIdl>
>

export interface CreatePoolParams {
  /** The bump seed for the pool address */
  poolBump: number
  /** The bump seed for the vault account */
  vaultBump: number
  /** The bump seed for the deposit note mint */
  depositNoteMintBump: number
  /** The bump seed for the deposit note oracle */
  depositNoteOracleBump: number
  /** The bump seed for the loan note mint */
  loanNoteMintBump: number
  /** The bump seed for the loan note oracle */
  loadNoteOracleBump: number
  /** The destination account for any collected fees */
  feeDestination: PublicKey
  /** The configuration for the pool */
  config: MarginPoolConfigData
}

export interface DepositInfo {
  accounts: {
    /** The pool to deposit into */
    marginPool: PublicKey
    /** The vault for the pool, where tokens are held */
    vault: PublicKey
    /** The mint for the deposit notes */
    depositNoteMint: PublicKey
    /** The address with authority to deposit the tokens */
    depositor: PublicKey
    /** The source of the tokens to be deposited */
    source: PublicKey
    /** The destination of the deposit notes */
    destination: PublicKey
    tokenProgram: PublicKey
  }
  args: {
    amount: BN
  }
}
