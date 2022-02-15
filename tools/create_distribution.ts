import { RewardsClient } from "./../src/rewards/client"
import * as anchor from "@project-serum/anchor"
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { clusterApiUrl, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { resolve } from "path"
import { homedir } from "os"
import { Provider } from "@project-serum/anchor"

const args = {
  cluster: "https://api.devnet.solana.com",
  seed: "moose2",
  target: "CTP5Rep8XYcoPBjHJY3nCG2yAxRvM2c3n9sHkLhjxebJ",
  tokenSource: "5JKXeqsDCctvsXhzRBFY8VDVS3eDHbhTi9LAkcLxdPG3",
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

  const wallet = provider.wallet
  const rewardsProgram = await RewardsClient.connect(provider)

  const [distAccount, bumpSeed] = await PublicKey.findProgramAddress([Buffer.from(args.seed)], rewardsProgram.programId)

  const [distVault, vaultBumpSeed] = await PublicKey.findProgramAddress(
    [distAccount.toBuffer(), Buffer.from("vault")],
    rewardsProgram.programId
  )

  const now = Date.now() / 1000
  const end = now + 86400 * args.duration

  const fundingSource = new PublicKey(args.tokenSource)
  const fundingData = (await provider.connection.getAccountInfo(fundingSource)).data
  const fundingInfo = AccountLayout.decode(fundingData)

  await rewardsProgram.rpc.distributionCreate(
    {
      amount: new anchor.BN(args.amount),
      authority: wallet.publicKey,
      bumpSeed: bumpSeed,
      seed: args.seed,
      targetAccount: new PublicKey(args.target),
      vaultBump: vaultBumpSeed,
      beginAt: new anchor.BN(now),
      endAt: new anchor.BN(end)
    },
    {
      accounts: {
        distribution: distAccount,
        vault: distVault,
        payerRent: wallet.publicKey,
        payerTokenAuthority: wallet.publicKey,
        payerTokenAccount: fundingSource,
        tokenMint: fundingInfo.mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      }
    }
  )

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

  console.log(distAccount.toString())
}

;(async () => {
  await main()
})()
