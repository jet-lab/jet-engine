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

export type RewardsIdl = {
  version: "0.1.0"
  name: "jet_rewards"
  instructions: [
    {
      name: "airdropCreate"
      accounts: [
        {
          name: "airdrop"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: false
        },
        {
          name: "rewardVault"
          isMut: true
          isSigner: false
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "tokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rent"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "params"
          type: {
            defined: "AirdropCreateParams"
          }
        }
      ]
    },
    {
      name: "airdropAddRecipients"
      accounts: [
        {
          name: "airdrop"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        }
      ]
      args: [
        {
          name: "params"
          type: {
            defined: "AirdropAddRecipientsParams"
          }
        }
      ]
    },
    {
      name: "airdropFinalize"
      accounts: [
        {
          name: "airdrop"
          isMut: true
          isSigner: false
        },
        {
          name: "rewardVault"
          isMut: false
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        }
      ]
      args: []
    },
    {
      name: "airdropClose"
      accounts: [
        {
          name: "airdrop"
          isMut: true
          isSigner: false
        },
        {
          name: "rewardVault"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenReceiver"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "airdropClaim"
      accounts: [
        {
          name: "airdrop"
          isMut: true
          isSigner: false
        },
        {
          name: "rewardVault"
          isMut: true
          isSigner: false
        },
        {
          name: "recipient"
          isMut: false
          isSigner: true
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePool"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePoolVault"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "stakingProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "distributionCreate"
      accounts: [
        {
          name: "distribution"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "payerRent"
          isMut: true
          isSigner: true
        },
        {
          name: "payerTokenAuthority"
          isMut: false
          isSigner: true
        },
        {
          name: "payerTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rent"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "params"
          type: {
            defined: "DistributionCreateParams"
          }
        }
      ]
    },
    {
      name: "distributionRelease"
      accounts: [
        {
          name: "distribution"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "targetAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "distributionClose"
      accounts: [
        {
          name: "distribution"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "awardCreate"
      accounts: [
        {
          name: "award"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenSource"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenSourceAuthority"
          isMut: false
          isSigner: true
        },
        {
          name: "payerRent"
          isMut: true
          isSigner: true
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rent"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "params"
          type: {
            defined: "AwardCreateParams"
          }
        }
      ]
    },
    {
      name: "awardRelease"
      accounts: [
        {
          name: "award"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePool"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePoolVault"
          isMut: true
          isSigner: false
        },
        {
          name: "stakingProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "awardClose"
      accounts: [
        {
          name: "award"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "awardRevoke"
      accounts: [
        {
          name: "award"
          isMut: true
          isSigner: false
        },
        {
          name: "vault"
          isMut: true
          isSigner: false
        },
        {
          name: "receiver"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenReceiver"
          isMut: true
          isSigner: false
        },
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: "Airdrop"
      type: {
        kind: "struct"
        fields: [
          {
            name: "address"
            type: "publicKey"
          },
          {
            name: "rewardVault"
            type: "publicKey"
          },
          {
            name: "authority"
            type: "publicKey"
          },
          {
            name: "expireAt"
            type: "i64"
          },
          {
            name: "stakePool"
            type: "publicKey"
          },
          {
            name: "flags"
            type: "u64"
          },
          {
            name: "shortDesc"
            type: {
              array: ["u8", 31]
            }
          },
          {
            name: "vaultBump"
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "targetInfo"
            type: {
              array: ["u8", 400024]
            }
          }
        ]
      }
    },
    {
      name: "Award"
      type: {
        kind: "struct"
        fields: [
          {
            name: "authority"
            type: "publicKey"
          },
          {
            name: "seed"
            type: "string"
          },
          {
            name: "bumpSeed"
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "stakeAccount"
            type: "publicKey"
          },
          {
            name: "vault"
            type: "publicKey"
          },
          {
            name: "tokenDistribution"
            type: {
              defined: "TokenDistribution"
            }
          }
        ]
      }
    },
    {
      name: "Distribution"
      type: {
        kind: "struct"
        fields: [
          {
            name: "address"
            type: "publicKey"
          },
          {
            name: "authority"
            type: "publicKey"
          },
          {
            name: "vault"
            type: "publicKey"
          },
          {
            name: "seed"
            type: {
              array: ["u8", 30]
            }
          },
          {
            name: "seedLen"
            type: "u8"
          },
          {
            name: "bumpSeed"
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "targetAccount"
            type: "publicKey"
          },
          {
            name: "tokenDistribution"
            type: {
              defined: "TokenDistribution"
            }
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "AirdropAddRecipientsParams"
      type: {
        kind: "struct"
        fields: [
          {
            name: "startIndex"
            type: "u64"
          },
          {
            name: "recipients"
            type: {
              vec: {
                defined: "AirdropRecipientParam"
              }
            }
          }
        ]
      }
    },
    {
      name: "AirdropRecipientParam"
      type: {
        kind: "struct"
        fields: [
          {
            name: "amount"
            type: "u64"
          },
          {
            name: "recipient"
            type: "publicKey"
          }
        ]
      }
    },
    {
      name: "AirdropCreateParams"
      type: {
        kind: "struct"
        fields: [
          {
            name: "expireAt"
            type: "i64"
          },
          {
            name: "stakePool"
            type: "publicKey"
          },
          {
            name: "shortDesc"
            type: "string"
          },
          {
            name: "vaultBump"
            type: "u8"
          },
          {
            name: "flags"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "AwardCreateParams"
      type: {
        kind: "struct"
        fields: [
          {
            name: "seed"
            type: "string"
          },
          {
            name: "bumpSeed"
            type: "u8"
          },
          {
            name: "authority"
            type: "publicKey"
          },
          {
            name: "stakeAccount"
            type: "publicKey"
          },
          {
            name: "amount"
            type: "u64"
          },
          {
            name: "beginAt"
            type: "u64"
          },
          {
            name: "endAt"
            type: "u64"
          },
          {
            name: "vaultBump"
            type: "u8"
          }
        ]
      }
    },
    {
      name: "TokenDistribution"
      type: {
        kind: "struct"
        fields: [
          {
            name: "targetAmount"
            type: "u64"
          },
          {
            name: "distributed"
            type: "u64"
          },
          {
            name: "beginAt"
            type: "u64"
          },
          {
            name: "endAt"
            type: "u64"
          },
          {
            name: "kind"
            type: {
              defined: "DistributionKind"
            }
          }
        ]
      }
    },
    {
      name: "DistributionCreateParams"
      type: {
        kind: "struct"
        fields: [
          {
            name: "seed"
            type: "string"
          },
          {
            name: "bumpSeed"
            type: "u8"
          },
          {
            name: "authority"
            type: "publicKey"
          },
          {
            name: "targetAccount"
            type: "publicKey"
          },
          {
            name: "amount"
            type: "u64"
          },
          {
            name: "beginAt"
            type: "u64"
          },
          {
            name: "endAt"
            type: "u64"
          },
          {
            name: "vaultBump"
            type: "u8"
          }
        ]
      }
    },
    {
      name: "DistributionKind"
      type: {
        kind: "enum"
        variants: [
          {
            name: "Linear"
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 6000
      name: "RecipientNotFound"
    },
    {
      code: 6001
      name: "AddOutOfOrder"
    },
    {
      code: 6002
      name: "AirdropFinal"
    },
    {
      code: 6003
      name: "AirdropInsufficientRewardBalance"
    },
    {
      code: 6004
      name: "AirdropExpired"
    },
    {
      code: 6005
      name: "RecipientsNotSorted"
    },
    {
      code: 6006
      name: "ClaimNotVerified"
    },
    {
      code: 6007
      name: "DistributionNotEnded"
    },
    {
      code: 6008
      name: "AwardNotFullyVested"
    }
  ]
}
