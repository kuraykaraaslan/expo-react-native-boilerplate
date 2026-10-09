import axiosInstance from "@/libs/axios";
import { EvaluateAllFlagsResponseSchema, type FlagMap } from "@/services/platform/flags.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class FlagsClientService {
  /** Every flag of the active tenant, evaluated for the signed-in user. */
  static async evaluateAll(): Promise<FlagMap> {
    const res = await axiosInstance.post("/feature-flags/evaluate", {});
    return EvaluateAllFlagsResponseSchema.parse(res.data).flags;
  }
}
