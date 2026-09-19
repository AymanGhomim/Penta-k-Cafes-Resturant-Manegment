export type BrandAssetKind = "logo" | "favicon" | "loginBackground";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";

type BrandAssetRule = {
  accept: readonly string[];
  maxBytes: number;
  maxSizeLabel: string;
};

const COMMON_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const BRAND_ASSET_RULES: Record<BrandAssetKind, BrandAssetRule> = {
  logo: {
    accept: COMMON_IMAGE_TYPES,
    maxBytes: 2 * 1024 * 1024,
    maxSizeLabel: "2 ميجابايت",
  },
  favicon: {
    accept: [
      ...COMMON_IMAGE_TYPES,
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ],
    maxBytes: 1024 * 1024,
    maxSizeLabel: "1 ميجابايت",
  },
  loginBackground: {
    accept: COMMON_IMAGE_TYPES,
    maxBytes: 5 * 1024 * 1024,
    maxSizeLabel: "5 ميجابايت",
  },
};

export type BrandAssetValidation =
  | { valid: true }
  | { valid: false; error: string };

function validateImage(
  file: File,
  kind: BrandAssetKind,
): BrandAssetValidation {
  const rule = BRAND_ASSET_RULES[kind];

  if (!rule.accept.includes(file.type)) {
    return { valid: false, error: "صيغة الصورة غير مدعومة" };
  }

  if (file.size > rule.maxBytes) {
    return {
      valid: false,
      error: `حجم الصورة أكبر من الحد المسموح (${rule.maxSizeLabel})`,
    };
  }

  return { valid: true };
}

async function serializeForDevelopment(file: File, kind: BrandAssetKind) {
  const validation = validateImage(file, kind);
  if (!validation.valid) throw new Error(validation.error);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  const response = await httpClient.post<{ success: boolean; data: { url: string } }>(`${API_ENDPOINTS.platform.uploads}/brand-asset`, formData, { headers: { "Content-Type": undefined } });
  return response.data.data.url;
}

export const brandAssetService = {
  validateImage,
  serializeForDevelopment,
  createPreview: serializeForDevelopment,
  removeAsset: () => undefined,
  getAccept: (kind: BrandAssetKind) =>
    BRAND_ASSET_RULES[kind].accept.join(","),
  getRule: (kind: BrandAssetKind) => BRAND_ASSET_RULES[kind],
};
