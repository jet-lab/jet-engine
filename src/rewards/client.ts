/*
 * Copyright (C) 2022 JET PROTOCOL HOLDINGS, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
