import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { sellerColors, sellerRadius } from '@/theme/seller';
import { resolveMediaUrl } from '@/utils/media';

export function SellerImageUploadField({
  label,
  value,
  helperText,
  buttonText,
  uploading,
  onUpload,
}: {
  label: string;
  value: string;
  helperText?: string;
  buttonText?: string;
  uploading?: boolean;
  onUpload: () => void;
}) {
  return (
    <View style={styles.mediaCard}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Pressable style={({ pressed }) => [styles.uploadBtn, pressed ? styles.pressed : null]} disabled={uploading} onPress={onUpload}>
          <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
          <Text style={styles.uploadBtnText}>{uploading ? '上传中...' : buttonText || '上传图片'}</Text>
        </Pressable>
      </View>
      {value ? (
        <Image source={{ uri: resolveMediaUrl(value) ?? value }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={26} color={sellerColors.muted} />
        </View>
      )}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaCard: {
    marginTop: 12,
    borderRadius: sellerRadius.md,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 6,
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: sellerRadius.pill,
    backgroundColor: sellerColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    marginTop: 12,
    width: '100%',
    height: 170,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
  },
  placeholder: {
    marginTop: 12,
    width: '100%',
    height: 130,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: sellerColors.muted,
  },
  pressed: {
    opacity: 0.92,
  },
});
