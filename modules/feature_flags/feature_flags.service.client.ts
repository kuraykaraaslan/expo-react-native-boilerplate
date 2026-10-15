import axiosInstance from "@/libs/axios";
import { EvaluateAllFlagsResponseSchema, type FlagMap } from "@/modules/feature_flags/feature_flags.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class FeatureFlagsClientService {
  /** Every flag of the active tenant, evaluated for the signed-in user. */
  static async evaluateAll(attributes?: Record<string, string | number | boolean>): Promise<FlagMap> {
    const res = await axiosInstance.post("/feature-flags/evaluate", attributes ? { attributes } : {});
    return EvaluateAllFlagsResponseSchema.parse(res.data).flags;
  }
}
