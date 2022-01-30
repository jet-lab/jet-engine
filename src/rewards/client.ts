import { Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { connect } from "../common"
import { Hooks } from "../common/hooks"

export class RewardsClient {
  static readonly PROGRAM_ID = new PublicKey("JET777rQuPU8BatFbhp6irc1NAbozxTheBqNo25eLQP")

  /**
   * Create a new client for interacting with the Jet rewards program
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
   * @returns {Promise<Program>} The program
   * @memberof RewardsClient
   */
  static async connect(provider: Provider): Promise<Program> {
    return await connect(RewardsClient.PROGRAM_ID, provider)
  }

  /**
   * React hook to use the rewards program
   *
   * @static
   * @param {Provider} provider
   * @returns {(Program | undefined)} The program
   * @memberof RewardsClient
   */
  static use(provider: Provider | undefined): Program | undefined {
    return Hooks.usePromise(async () => provider && RewardsClient.connect(provider), [provider])
  }
}
