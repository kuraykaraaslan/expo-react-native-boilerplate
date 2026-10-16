import { Platform } from "react-native";
import axiosInstance from "@/libs/axios";
import logger from "@/libs/logger";
import {
  LanguagesResponseSchema,
  RemoteLanguageSchema,
  TranslationBundleRequestSchema,
  TranslationBundleSchema,
  TranslationPlatformSchema,
  type RemoteLanguage,
  type TranslationBundle,
} from "@/modules/localization/translation.dto";

// ============================================================================
// Translation Client Service — guest routes (no token), see translation.dto.ts.
// ============================================================================

export class TranslationClientService {
  /** The languages the server offers, each with the version of every module's texts for this platform. */
  static async getLanguages(): Promise<RemoteLanguage[]> {
    const platform = TranslationPlatformSchema.parse(Platform.OS);
    const res = await axiosInstance.get("/localization/languages", { params: { platform }, skipAuth: true });
    return LanguagesResponseSchema.parse(res.data).languages.flatMap((item) => {
      const language = RemoteLanguageSchema.safeParse(item);
      if (language.success) return [language.data];
      logger.warn("[i18n] skipping a malformed language from the server", language.error.issues[0]?.message ?? "invalid");
      return [];
    });
  }

  /** One module's dictionary in one language, for this platform. */
  static async getBundle(code: string, module: string): Promise<TranslationBundle> {
    const body = TranslationBundleRequestSchema.parse({ platform: Platform.OS, module });
    const res = await axiosInstance.post(`/localization/languages/${encodeURIComponent(code)}`, body, { skipAuth: true });
    return TranslationBundleSchema.parse(res.data);
  }
}
