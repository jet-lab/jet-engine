/**
 * This example creates a stake pool for staking
 * Jet tokens and minting vote tokens.
 */

import { BN, Provider } from "@project-serum/anchor"
import { StakeClient, StakePool } from "../src";
import { resolve } from "path"
import { homedir } from "os";
import process from "process";
import { PublicKey } from "@solana/web3.js";

// ------ Parameters ------

const mainnet = false;

const cluster = mainnet ?
  "https://api.mainnet.solana.com" :
  "https://api.devnet.solana.com"

const seed = "usadhiushfa"

/** The address paying to create this pool */
const payer = new PublicKey("EjvPni9o9ku9oeNBdXwEAY4YxzyNi5E335wQP97YQmdM")

/** The address allowed to sign for changes to the pool,
    and management of the token balance. */
const authority = new PublicKey("EjvPni9o9ku9oeNBdXwEAY4YxzyNi5E335wQP97YQmdM")

/** The mint for the tokens being staked into the pool. */
const tokenMint = mainnet ?
  new PublicKey("JET6zMJWkCN9tpRT2v2jfAmm5VnQFDpUBCyaKojmGtz") :
  new PublicKey("FRuFWBrp1Kh6LpAi9CRvjk97C6YpCR7AERq62N2CZFUg")

/** The time period for unbonding staked tokens from the pool.
 
Unit is seconds. */
const unbondPeriod = new BN(2551443);
// 29.53059 Days

// ------ Main ------

async function main() {
  process.env.ANCHOR_WALLET = resolve(homedir(), ".config/solana/id.json");
  const provider = Provider.local(cluster);

  const client = await StakeClient.connect(provider)
  await StakePool.create(client, {
    accounts: {
      payer,
      authority,
      tokenMint,
    },
    args: {
      unbondPeriod,
      seed
    }
  })

  await new Promise<void>(r => setTimeout(() => r(), 5000))
  const pool = await StakePool.load(client, seed);

  console.log(JSON.stringify(Object.entries(pool.addresses.accounts).map(([key, value]) => [key, value.toBase58()])))
  /**
   * [
   *   ["stakePool","F8JjUkKBnYECxTZvNhqvpmAKhNkrpp1mxsgJfdSJPsZA"],
   *   ["stakeVoteMint","8WPjDrATG3q6gRzk3Md6pKWTmAZyLUZKqra7t44QdUY4"],
   *   ["stakeCollateralMint","BDA1g9hzLfU18CHRRm1BDYBknehQtVzhMbpRNsS6Z3zh"],
   *   ["stakePoolVault","6iGYHbR3dzMCdq4wEgsPGD9uXqmUfhkaEMex9Zj7egC2"]
   * ]
   */
}

main()