import { Platform } from "react-native";
import axiosInstance from "@/libs/axios";
import { NAMESPACE } from "@/libs/i18n";
import {
  LanguagesResponseSchema,
  TranslationBundleRequestSchema,
  TranslationBundleSchema,
  type RemoteLanguage,
  type TranslationBundle,
} from "@/modules/localization/translation.dto";

// ============================================================================
// Translation Client Service — guest routes (no token), see translation.dto.ts.
// ============================================================================

export class TranslationClientService {
  /** The languages the server offers, each with the version of its texts. */
  static async getLanguages(): Promise<RemoteLanguage[]> {
    const res = await axiosInstance.get("/localization/languages", { skipAuth: true });
    return LanguagesResponseSchema.parse(res.data).languages;
  }

  /** One language's dictionary for this platform. The app has one dictionary today (`common`). */
  static async getBundle(code: string, module: string = NAMESPACE): Promise<TranslationBundle> {
    const body = TranslationBundleRequestSchema.parse({ platform: Platform.OS, module });
    const res = await axiosInstance.post(`/localization/languages/${encodeURIComponent(code)}`, body, { skipAuth: true });
    return TranslationBundleSchema.parse(res.data);
  }
}
