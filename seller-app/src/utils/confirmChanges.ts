import { Alert } from 'react-native';

export function confirmChanges({
  title,
  changes,
  emptyMessage = '当前没有需要保存的修改',
  confirmText = '确认保存',
  onConfirm,
}: {
  title: string;
  changes: string[];
  emptyMessage?: string;
  confirmText?: string;
  onConfirm: () => void;
}) {
  if (changes.length === 0) {
    Alert.alert('未检测到变更', emptyMessage);
    return;
  }
  Alert.alert(title, changes.slice(0, 7).join('\n'), [
    { text: '再看看', style: 'cancel' },
    { text: confirmText, onPress: onConfirm },
  ]);
}
