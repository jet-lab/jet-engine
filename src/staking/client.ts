/*
 * Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
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

import { Idl, Program, Provider } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"
import { JET_STAKE_ID } from "."
import { connect } from "../common"
import { Hooks } from "../common/hooks"

/**
 * TODO:
 * @export
 * @class JetClient
 */
export class StakeClient {
  static readonly PROGRAM_ID = new PublicKey("JPLockxtkngHkaQT5AuRYow3HyUv5qWzmhwsCPd653n")
  /**
   * Create a new client for interacting with the Jet staking program.
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
   * @returns {Promise<Program>} The client
   * @memberof StakeClient
   */
  static async connect(provider: Provider): Promise<Program> {
    return await connect(JET_STAKE_ID, provider)
    // const program = await connect(StakeClient.PROGRAM_ID, provider)

    // FIXME! this is a workaround for bad types
    // const acc = program.account
    // acc.StakePool = (acc as any).stakePool
    // acc.StakeAccount = (acc as any).stakeAccount
    // acc.UnbondingAccount = (acc as any).unbondingAccount

    // return program
  }

  /**
   * TODO:
   * @static
   * @param {Provider} provider
   * @returns {(Program<Idl> | undefined)}
   * @memberof StakeClient
   */
  static use(provider: Provider): Program<Idl> | undefined {
    return Hooks.usePromise(async () => StakeClient.connect(provider), [provider])
  }
}
