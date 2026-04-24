import { API_BASE_URL } from '@/constants/api';

/**
 * 将商品/店铺等媒体地址转为可在 RN Image 中加载的绝对 URL。
 * - 本地上传接口返回的相对路径（如 `/uploads/xxx.jpg`）会拼到 `API_BASE_URL`。
 * - 公网地址（含阿里云 OSS、腾讯云 COS 等 `https://` 外链）原样返回。
 */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  const suffix = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${suffix}`;
}
