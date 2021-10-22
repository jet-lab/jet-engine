import { PublicKey, Keypair } from '@solana/web3.js'
import { Program, Provider } from '@project-serum/anchor'
import { Jet, IDL } from './jet'
import { CreateMarketParams, JetMarket } from './market'
import { JET_ID } from '.'

interface ToBytes {
  toBytes(): Uint8Array
}

interface HasPublicKey {
  publicKey: PublicKey
}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string

/**
 * TODO:
 * @export
 * @class DerivedAccount
 */
export class DerivedAccount {
  public address: PublicKey
  public bumpSeed: number

  /**
   * Creates an instance of DerivedAccount.
   * @param {PublicKey} address
   * @param {number} bumpSeed
   * @memberof DerivedAccount
   */
  constructor(address: PublicKey, bumpSeed: number) {
    this.address = address
    this.bumpSeed = bumpSeed
  }
}

/**
 * TODO:
 * @export
 * @class JetClient
 */
export class JetClient {
  /**
   * Creates an instance of JetClient.
   * @param {Program<Jet>} program
   * @param {boolean} [devnet]
   * @memberof JetClient
   */
  constructor(public program: Program<Jet>, public devnet?: boolean) {}

  /**
   * Create a new client for interacting with the Jet lending program.
   * @param {Provider} provider The provider with wallet/network access that can be used to send transactions.
   * @param {boolean} [devnet] Flag to determine if the connection is for devnet
   * @returns {Promise<JetClient>} The client
   * @memberof JetClient
   */
  static async connect(provider: Provider, devnet?: boolean): Promise<JetClient> {
    return new JetClient(new Program(IDL, JET_ID, provider), devnet)
  }

  /**
   * Find a PDA
   * @param {DerivedAccountSeed[]} seeds
   * @returns {Promise<DerivedAccount>}
   * @memberof JetClient
   */
  async findDerivedAccount(seeds: DerivedAccountSeed[]): Promise<DerivedAccount> {
    const seedBytes = seeds.map(s => {
      if (typeof s == 'string') {
        return Buffer.from(s)
      } else if ('publicKey' in s) {
        return s.publicKey.toBytes()
      } else if ('toBytes' in s) {
        return s.toBytes()
      } else {
        return s
      }
    })
    const [address, bumpSeed] = await PublicKey.findProgramAddress(
      seedBytes,
      this.program.programId
    )
    return new DerivedAccount(address, bumpSeed)
  }

  /**
   * TODO:
   * @param {CreateMarketParams} params
   * @returns {Promise<JetMarket>}
   * @memberof JetClient
   */
  async createMarket(params: CreateMarketParams): Promise<JetMarket> {
    let account = params.account

    if (account == undefined) {
      account = Keypair.generate()
    }

    await this.program.rpc.initMarket(
      params.owner,
      params.quoteCurrencyName,
      params.quoteCurrencyMint,
      {
        accounts: {
          market: account.publicKey
        },
        signers: [account],
        instructions: [await this.program.account.market.createInstruction(account)]
      }
    )

    return JetMarket.load(this, account.publicKey)
  }
}
