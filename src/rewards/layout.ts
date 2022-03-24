import * as BL from "@solana/buffer-layout"
import { pubkeyField, u64Field } from "../common/accountParser"

export const AirdropTargetStruct = BL.struct([u64Field("amount"), pubkeyField("recipient")])

export const AirdropTargetStructList = BL.seq(AirdropTargetStruct, 10000)

export const AirdropTargetsStruct = BL.struct([
  u64Field("rewardTotal"),
  u64Field("recipientsTotal"),
  u64Field("finalized"),
  AirdropTargetStructList.replicate("recipients")
])

console.assert(AirdropTargetStruct.span === 40)
console.assert(AirdropTargetsStruct.span === 400024)
