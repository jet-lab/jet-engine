import { AllAccountsMap, IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types"
import { JetMetadataIdl } from ".."

export type LiquidatorAdapterMetadata = TypeDef<
  AllAccountsMap<JetMetadataIdl>["liquidatorAdapterMetadata"],
  IdlTypes<JetMetadataIdl>
>
export type LiquidatorMetadata = TypeDef<AllAccountsMap<JetMetadataIdl>["liquidatorMetadata"], IdlTypes<JetMetadataIdl>>
export type MarginAdapterMetadata = TypeDef<
  AllAccountsMap<JetMetadataIdl>["marginAdapterMetadata"],
  IdlTypes<JetMetadataIdl>
>
export type PositionTokenMetadata = TypeDef<
  AllAccountsMap<JetMetadataIdl>["positionTokenMetadata"],
  IdlTypes<JetMetadataIdl>
>
export type TokenMetadata = TypeDef<AllAccountsMap<JetMetadataIdl>["tokenMetadata"], IdlTypes<JetMetadataIdl>>
