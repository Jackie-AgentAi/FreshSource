import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';

type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

function buildUploadFile(asset: UploadAsset, fallbackName: string) {
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type: asset.mimeType || 'image/jpeg',
  } as any;
}

export async function uploadImageAsset(asset: UploadAsset): Promise<string> {
  const formData = new FormData();
  formData.append('file', buildUploadFile(asset, `seller-${Date.now()}.jpg`));
  const { data } = await client.post<ApiEnvelope<{ url: string }>>('/api/v1/common/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return unwrap(data).url;
}

export async function uploadImageAssets(assets: UploadAsset[]): Promise<string[]> {
  if (assets.length === 0) {
    return [];
  }
  const formData = new FormData();
  assets.forEach((asset, index) => {
    formData.append('files', buildUploadFile(asset, `seller-${Date.now()}-${index}.jpg`));
  });
  const { data } = await client.post<ApiEnvelope<{ urls: string[] }>>('/api/v1/common/upload/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return unwrap(data).urls;
}
