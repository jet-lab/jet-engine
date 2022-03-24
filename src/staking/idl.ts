export type StakeIdl = {
  version: "1.0.0"
  name: "jet_staking"
  instructions: [
    {
      name: "initPool"
      accounts: [
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "authority"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "stakePool"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeVoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeCollateralMint"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePoolVault"
          isMut: true
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
          name: "seed"
          type: "string"
        },
        {
          name: "config"
          type: {
            defined: "PoolConfig"
          }
        }
      ]
    },
    {
      name: "initStakeAccount"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "auth"
          isMut: false
          isSigner: false
        },
        {
          name: "stakePool"
          isMut: false
          isSigner: false
        },
        {
          name: "stakeAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "addStake"
      accounts: [
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
          name: "payer"
          isMut: false
          isSigner: true
        },
        {
          name: "payerTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "unbondStake"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
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
          isMut: false
          isSigner: false
        },
        {
          name: "unbondingAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "seed"
          type: "u32"
        },
        {
          name: "amount"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "cancelUnbond"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "receiver"
          isMut: false
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
          isMut: false
          isSigner: false
        },
        {
          name: "unbondingAccount"
          isMut: true
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "withdrawUnbonded"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "closer"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenReceiver"
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
          name: "unbondingAccount"
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
      name: "withdrawBonded"
      accounts: [
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "stakePool"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenReceiver"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePoolVault"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: "u64"
        }
      ]
    },
    {
      name: "mintVotes"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "stakePool"
          isMut: true
          isSigner: false
        },
        {
          name: "stakePoolVault"
          isMut: false
          isSigner: false
        },
        {
          name: "stakeVoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "voterTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "governanceRealm"
          isMut: false
          isSigner: false
        },
        {
          name: "governanceVault"
          isMut: true
          isSigner: false
        },
        {
          name: "governanceOwnerRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "governanceProgram"
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
          name: "amount"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "burnVotes"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "stakePool"
          isMut: false
          isSigner: false
        },
        {
          name: "stakeVoteMint"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "voterTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "voter"
          isMut: false
          isSigner: true
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "closeStakeAccount"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "closer"
          isMut: true
          isSigner: false
        },
        {
          name: "stakeAccount"
          isMut: true
          isSigner: false
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: "StakePool"
      type: {
        kind: "struct"
        fields: [
          {
            name: "authority"
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
            name: "tokenMint"
            type: "publicKey"
          },
          {
            name: "stakePoolVault"
            type: "publicKey"
          },
          {
            name: "stakeVoteMint"
            type: "publicKey"
          },
          {
            name: "stakeCollateralMint"
            type: "publicKey"
          },
          {
            name: "unbondPeriod"
            type: "i64"
          },
          {
            name: "vaultAmount"
            type: "u64"
          },
          {
            name: "unbondChangeIndex"
            type: "u64"
          },
          {
            name: "bonded"
            type: {
              defined: "SharedTokenPool"
            }
          },
          {
            name: "unbonding"
            type: {
              defined: "SharedTokenPool"
            }
          }
        ]
      }
    },
    {
      name: "StakeAccount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "owner"
            type: "publicKey"
          },
          {
            name: "stakePool"
            type: "publicKey"
          },
          {
            name: "bondedShares"
            type: "u64"
          },
          {
            name: "mintedVotes"
            type: "u64"
          },
          {
            name: "mintedCollateral"
            type: "u64"
          },
          {
            name: "unbondingShares"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "UnbondingAccount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "stakeAccount"
            type: "publicKey"
          },
          {
            name: "shares"
            type: "u64"
          },
          {
            name: "unbondedAt"
            type: "i64"
          },
          {
            name: "unbondChangeIndex"
            type: "u64"
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "PoolConfig"
      type: {
        kind: "struct"
        fields: [
          {
            name: "unbondPeriod"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SharedTokenPool"
      type: {
        kind: "struct"
        fields: [
          {
            name: "tokens"
            type: "u64"
          },
          {
            name: "shares"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "FullAmount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "tokenAmount"
            type: "u64"
          },
          {
            name: "shareAmount"
            type: "u64"
          },
          {
            name: "allShares"
            type: "u64"
          },
          {
            name: "allTokens"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Rounding"
      type: {
        kind: "enum"
        variants: [
          {
            name: "Up"
          },
          {
            name: "Down"
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 6000
      name: "InsufficientStake"
    },
    {
      code: 6001
      name: "VotesLocked"
    },
    {
      code: 6002
      name: "CollateralLocked"
    },
    {
      code: 6003
      name: "NotYetUnbonded"
    },
    {
      code: 6004
      name: "StakeRemaining"
    },
    {
      code: 6005
      name: "InvalidAmount"
    }
  ]
}
