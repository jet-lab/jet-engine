export type StakeIdl = {
  version: "0.1.0"
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
          name: "bump"
          type: {
            defined: "InitPoolSeeds"
          }
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
      args: [
        {
          name: "bump"
          type: "u8"
        }
      ]
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
            defined: "Amount"
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
          isMut: false
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
          name: "bump"
          type: "u8"
        },
        {
          name: "seed"
          type: "u32"
        },
        {
          name: "amount"
          type: {
            defined: "Amount"
          }
        }
      ]
    },
    {
      name: "withdrawUnbondend"
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
      name: "mintVotes"
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
          name: "tokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "amount"
          type: {
            defined: "Amount"
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
          type: "u64"
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
            name: "sharesBonded"
            type: "u64"
          },
          {
            name: "tokensUnbonding"
            type: "u64"
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
            name: "shares"
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
            name: "unbonding"
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
            name: "amount"
            type: {
              defined: "FullAmount"
            }
          },
          {
            name: "unbondedAt"
            type: "i64"
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "Amount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "kind"
            type: {
              defined: "AmountKind"
            }
          },
          {
            name: "value"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "InitPoolSeeds"
      type: {
        kind: "struct"
        fields: [
          {
            name: "stakePool"
            type: "u8"
          },
          {
            name: "stakeVoteMint"
            type: "u8"
          },
          {
            name: "stakeCollateralMint"
            type: "u8"
          },
          {
            name: "stakePoolVault"
            type: "u8"
          }
        ]
      }
    },
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
      name: "FullAmount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "shares"
            type: "u64"
          },
          {
            name: "tokens"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "AmountKind"
      type: {
        kind: "enum"
        variants: [
          {
            name: "Tokens"
          },
          {
            name: "Shares"
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
    }
  ]
}
