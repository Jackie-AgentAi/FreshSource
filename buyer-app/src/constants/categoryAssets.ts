import type { ImageSourcePropType } from 'react-native';

import { resolveMediaUrl } from '@/utils/media';

const vegetableImage = require('../../assets/images/categories/vegetable.png');
const porkImage = require('../../assets/images/categories/pork.png');
const fishImage = require('../../assets/images/categories/fish.png');
const otherImage = require('../../assets/images/categories/other.png');

const CATEGORY_IMAGE_ALIASES: Array<{
  keywords: string[];
  source: ImageSourcePropType;
}> = [
  {
    keywords: ['蔬菜', '叶菜', '根茎', '瓜果', '菌菇', '豆类'],
    source: vegetableImage,
  },
  {
    keywords: ['猪肉', '肉类', '牛肉', '羊肉', '禽肉'],
    source: porkImage,
  },
  {
    keywords: ['鱼类', '水产', '海鲜', '虾蟹', '贝类'],
    source: fishImage,
  },
  {
    keywords: ['其他', '综合', '百货', '默认'],
    source: otherImage,
  },
];

export function resolveCategoryLocalImage(name?: string | null): ImageSourcePropType | undefined {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    return undefined;
  }

  const matched = CATEGORY_IMAGE_ALIASES.find((entry) =>
    entry.keywords.some((keyword) => normalizedName.includes(keyword)),
  );

  return matched?.source;
}

export function resolveCategoryImageSource({
  icon,
  name,
}: {
  icon?: string | null;
  name?: string | null;
}): ImageSourcePropType | undefined {
  const remoteUri = resolveMediaUrl(icon);
  if (remoteUri) {
    return { uri: remoteUri };
  }

  return resolveCategoryLocalImage(name);
}
