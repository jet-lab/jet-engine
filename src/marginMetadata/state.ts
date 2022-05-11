import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"
import { MarginMetaDataIdl } from "./idl"

export type LiquidatorAdapterMetadata = TypeDef<
  AllAccountsMap<MarginMetaDataIdl>["liquidatorAdapterMetadata"],
  IdlTypes<MarginMetaDataIdl>
>
export type LiquidatorMetadata = TypeDef<
  AllAccountsMap<MarginMetaDataIdl>["liquidatorMetadata"],
  IdlTypes<MarginMetaDataIdl>
>
export type MarginAdapterMetadata = TypeDef<
  AllAccountsMap<MarginMetaDataIdl>["marginAdapterMetadata"],
  IdlTypes<MarginMetaDataIdl>
>
export type PositionTokenMetadata = TypeDef<
  AllAccountsMap<MarginMetaDataIdl>["positionTokenMetadata"],
  IdlTypes<MarginMetaDataIdl>
>
export type TokenMetadata = TypeDef<AllAccountsMap<MarginMetaDataIdl>["tokenMetadata"], IdlTypes<MarginMetaDataIdl>>
