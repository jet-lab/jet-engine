/**
 * This example creates a stake pool for staking
 * Jet tokens and minting vote tokens.
 */

import { BN, Provider } from "@project-serum/anchor"
import { StakeClient, StakePool } from "../src"
import { resolve } from "path"
import { homedir } from "os";
import process from "process";
import { PublicKey } from "@solana/web3.js";

// ------ Parameters ------

const mainnet = false;

const cluster = mainnet ?
  "https://api.mainnet.solana.com" :
  "https://api.devnet.solana.com"

const seed = StakePool.CANONICAL_SEED

/** The address allowed to sign for changes to the pool,
    and management of the token balance. */
const authority = new PublicKey("EjvPni9o9ku9oeNBdXwEAY4YxzyNi5E335wQP97YQmdM")

/** The mint for the tokens being staked into the pool. */
const tokenMint = mainnet ?
  new PublicKey("JET6zMJWkCN9tpRT2v2jfAmm5VnQFDpUBCyaKojmGtz") :
  new PublicKey("FRuFWBrp1Kh6LpAi9CRvjk97C6YpCR7AERq62N2CZFUg")

const governanceRealm = mainnet ? PublicKey.default : PublicKey.default

/** The time period for unbonding staked tokens from the pool.
 
Unit is seconds. */
const unbondPeriod = mainnet
  ? // 29.53059 Days
    new BN(2551443)
  : // 1 Minute
    new BN(60)

// ------ Main ------

async function main() {
  process.env.ANCHOR_WALLET = resolve(homedir(), ".config/solana/id.json")
  const provider = Provider.local(cluster)

  const program = await StakeClient.connect(provider)
  try {
    await StakePool.create(program, {
      accounts: {
        payer: provider.wallet.publicKey,
        authority,
        tokenMint
      },
      args: {
        unbondPeriod,
        seed,
        governanceRealm
      }
    })
  } catch (err) {
    console.log("Error creating stake pool")
    console.log(err)
  }

  await new Promise<void>(r => setTimeout(() => r(), 5000))
  const pool = await StakePool.load(program, seed)

  console.log(
    JSON.stringify(
      Object.entries(pool.addresses).map(([key, value]) => [key, value.toBase58()]),
      null,
      2
    )
  )
  /**
   * [
   *   ["stakePool","83bqcdNH5G7kUwxczSd5WkJWf76f68SEMNiUd3sNLBQH"],
   *   ["stakeVoteMint","ESxCuVFgh88UR3DWuq5JKwb15ppEw67tnZnedCTERV6M"],
   *   ["stakeCollateralMint","F47rk1FL92z7Pdy5NaCCQbd9j6FmipWskkbFBExttX5X"],
   *   ["stakePoolVault","CBMNo5LGWY3gksekivwd3uY42VMpa5tTcPJgAwWuig9P"]
   * ]
   */
}

main()