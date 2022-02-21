export type JetMarginMetaDataIdl = {
  version: "0.1.0"
  name: "jet_margin_metadata"
  instructions: [
    {
      name: "setEntry"
      accounts: [
        {
          name: "keyAccount"
          isMut: false
          isSigner: false
        },
        {
          name: "metadataAccount"
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
          name: "data"
          type: "bytes"
        }
      ]
    }
  ]
  accounts: [
    {
      name: "TokenOracleMetadata"
      type: {
        kind: "struct"
        fields: [
          {
            name: "tokenMint"
            type: "publicKey"
          },
          {
            name: "tokenOracle"
            type: "publicKey"
          },
          {
            name: "tokenKind"
            type: {
              defined: "TokenKind"
            }
          },
          {
            name: "weight"
            type: "u16"
          }
        ]
      }
    },
    {
      name: "MarginAdapterMetadata"
      type: {
        kind: "struct"
        fields: [
          {
            name: "adapterProgram"
            type: "publicKey"
          }
        ]
      }
    },
    {
      name: "LiquidatorAdapterMetadata"
      type: {
        kind: "struct"
        fields: [
          {
            name: "adapterProgram"
            type: "publicKey"
          }
        ]
      }
    },
    {
      name: "LiquidatorMetadata"
      type: {
        kind: "struct"
        fields: [
          {
            name: "liquidator"
            type: "publicKey"
          }
        ]
      }
    }
  ]
  types: [
    {
      name: "TokenKind"
      type: {
        kind: "enum"
        variants: [
          {
            name: "NonCollateral"
          },
          {
            name: "Collateral"
          },
          {
            name: "Claim"
          }
        ]
      }
    }
  ]
}
