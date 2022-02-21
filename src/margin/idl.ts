export type JetMarginIdl = {
  version: "0.1.0"
  name: "jet_margin"
  constants: [
    {
      name: "MIN_COLLATERAL_RATIO"
      type: "u16"
      value: "125_00"
    },
    {
      name: "MAX_ORACLE_CONFIDENCE"
      type: "u16"
      value: "5_00"
    }
  ]
  instructions: [
    {
      name: "initAccount"
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
          name: "marginAccount"
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
        }
      ]
    },
    {
      name: "registerPosition"
      accounts: [
        {
          name: "authority"
          isMut: false
          isSigner: true
        },
        {
          name: "payer"
          isMut: true
          isSigner: true
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenMint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenOracle"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenOracleMetadata"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rent"
          isMut: false
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
        }
      ]
    },
    {
      name: "updatePositionBalance"
      accounts: [
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "closePosition"
      accounts: [
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
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenAccount"
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
      name: "verifyHealthy"
      accounts: [
        {
          name: "marginAccount"
          isMut: false
          isSigner: false
        },
        {
          name: "signer"
          isMut: false
          isSigner: true
        }
      ]
      args: []
    },
    {
      name: "adapterInvoke"
      accounts: [
        {
          name: "owner"
          isMut: false
          isSigner: true
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "adapterProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "adapterMetadata"
          isMut: false
          isSigner: false
        },
        {
          name: "adapterScratch"
          isMut: true
          isSigner: false
        },
        {
          name: "scratchProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "accountMetas"
          type: {
            vec: {
              defined: "CompactAccountMeta"
            }
          }
        },
        {
          name: "data"
          type: "bytes"
        }
      ]
    },
    {
      name: "liquidateBegin"
      accounts: [
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "liquidator"
          isMut: false
          isSigner: true
        },
        {
          name: "liquidatorMetadata"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "liquidateEnd"
      accounts: [
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "liquidator"
          isMut: false
          isSigner: true
        }
      ]
      args: []
    },
    {
      name: "liquidatorInvoke"
      accounts: [
        {
          name: "liquidator"
          isMut: false
          isSigner: true
        },
        {
          name: "marginAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "adapterProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "adapterMetadata"
          isMut: false
          isSigner: false
        },
        {
          name: "adapterScratch"
          isMut: true
          isSigner: false
        },
        {
          name: "scratchProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "accountMetas"
          type: {
            vec: {
              defined: "CompactAccountMeta"
            }
          }
        },
        {
          name: "data"
          type: "bytes"
        }
      ]
    }
  ]
  accounts: [
    {
      name: "MarginAccount"
      type: {
        kind: "struct"
        fields: [
          {
            name: "version"
            type: "u8"
          },
          {
            name: "bumpSeed"
            type: {
              array: ["u8", 1]
            }
          },
          {
            name: "reserved0"
            type: {
              array: ["u8", 6]
            }
          },
          {
            name: "owner"
            type: "publicKey"
          },
          {
            name: "liquidator"
            type: "publicKey"
          },
          {
            name: "positions"
            type: {
              array: ["u8", 2048]
            }
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "CompactAccountMeta"
      type: {
        kind: "struct"
        fields: [
          {
            name: "isSigner"
            type: "u8"
          },
          {
            name: "isWritable"
            type: "u8"
          }
        ]
      }
    },
    {
      name: "AdapterResult"
      type: {
        kind: "struct"
        fields: [
          {
            name: "firstRemaining"
            type: "publicKey"
          },
          {
            name: "modifiedAccounts"
            type: {
              vec: "publicKey"
            }
          }
        ]
      }
    },
    {
      name: "PositionKind"
      type: {
        kind: "enum"
        variants: [
          {
            name: "NoValue"
          },
          {
            name: "Deposit"
          },
          {
            name: "Claim"
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 6000
      name: "MaxPositions"
      msg: "account cannot record any additional positions"
    },
    {
      code: 6001
      name: "UnknownPosition"
      msg: "account has no record of the position"
    },
    {
      code: 6002
      name: "CloseNonZeroPosition"
      msg: "attempting to close a position that has a balance"
    },
    {
      code: 6003
      name: "MissingPriceOracle"
      msg: "a price oracle account is missing"
    },
    {
      code: 6004
      name: "MismatchedOracle"
      msg: "an oracle account doesn't match a position"
    },
    {
      code: 6005
      name: "OracleConfidenceOutOfRange"
      msg: "the oracle price has a confidence value outside the acceptable range"
    },
    {
      code: 6006
      name: "Unhealthy"
      msg: "the account is not healthy"
    },
    {
      code: 6007
      name: "Healthy"
      msg: "the account is already healthy"
    },
    {
      code: 6008
      name: "Liquidating"
      msg: "the account is being liquidated"
    },
    {
      code: 6009
      name: "NotLiquidating"
      msg: "the account is not being liquidated"
    }
  ]
}
