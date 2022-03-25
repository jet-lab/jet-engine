import { AssociatedToken } from "./../src/common/associatedToken"
import { StakeClient } from "./../src/staking/client"
import { StakePool } from "./../src/staking/stakePool"
import { Distribution } from "./../src/rewards/distribution"
import { RewardsClient } from "./../src/rewards/client"
import * as anchor from "@project-serum/anchor"
import { resolve } from "path"
import { homedir } from "os"
import { Provider } from "@project-serum/anchor"

const args = {
  cluster: "https://api.devnet.solana.com",
  seed: "moose5",
  targetStakePoolSeed: StakePool.CANONICAL_SEED,
  /** Distrubtion amount. Unit is lamports */
  amount: 1_000_000_000_000,
  /** Duration. Unit is days */
  duration: 30
}

/*
yargs(process.argv.slice(2))
  .usage("create-dist.ts --seed <seed> --token-source <address> --target <address> --amount <amount> --duration <days>")
  .help()
  .options({
      url: { type: "string", default: "localnet", alias: "u" },
      seed: { type: "string", alias: "s" },
      tokenSource: { type: "string" },
      target: { type: "string" },
      amount: { type: "number" },
      duration: { type: "number" },
  })
  .parseSync();
*/

export interface DistributionConfig {
  seed: string
  targetAccount: string
  amount: number
  beginAt: number
  endAt: number
}

async function main() {
  process.env.ANCHOR_WALLET = resolve(homedir(), ".config/solana/id.json")
  const provider = Provider.local(args.cluster)
  const { connection, wallet } = provider

  const rewardsProgram = await RewardsClient.connect(provider)
  const stakeProgram = await StakeClient.connect(provider)
  const stakePool = await StakePool.load(stakeProgram as any, args.targetStakePoolSeed)
  const tokenSource = await AssociatedToken.load(connection, stakePool.stakePool.tokenMint, wallet.publicKey)

  if (!tokenSource) {
    throw new Error("Wallet does not have a token account to withdraw from.")
  }

  const now = Date.now() / 1000
  const end = now + 86400 * args.duration

  await Distribution.createForStakePool(rewardsProgram, stakePool, {
    args: {
      amount: new anchor.BN(args.amount),
      authority: wallet.publicKey,
      seed: args.seed,
      beginAt: new anchor.BN(now),
      endAt: new anchor.BN(end)
    },
    accounts: {
      payerTokenAuthority: wallet.publicKey,
      payerTokenAccount: tokenSource.address
    }
  })

  /*
  await program.rpc.distributionRelease({
    accounts: {
      distribution: distAccount,
      vault: distVault,
      targetAccount: new PublicKey(args.target),
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
  */

  const accounts = Distribution.derive(args.seed)
  console.log(accounts.distribution.toBase58(), accounts.vault.toBase58())
}

main()
