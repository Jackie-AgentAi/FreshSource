import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type QuantityStepperProps = {
  value: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
};

function snapQuantity(value: number, min: number, step: number): number {
  const safeMin = min > 0 ? min : 1;
  const safeStep = step > 0 ? step : 1;
  if (!Number.isFinite(value) || value <= safeMin) {
    return safeMin;
  }
  const snapped = safeMin + Math.round((value - safeMin) / safeStep) * safeStep;
  return Number(snapped.toFixed(2));
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function QuantityStepper({
  value,
  min = 1,
  step = 1,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  const [draft, setDraft] = useState(formatQuantity(value));

  useEffect(() => {
    setDraft(formatQuantity(value));
  }, [value]);

  const applyDraft = () => {
    const next = snapQuantity(Number(draft), min, step);
    setDraft(formatQuantity(next));
    onChange(next);
  };

  const updateByDelta = (delta: number) => {
    const current = Number(draft);
    const base = Number.isFinite(current) ? current : value;
    const next = snapQuantity(base + delta, min, step);
    setDraft(formatQuantity(next));
    onChange(next);
  };

  return (
    <View style={[styles.wrap, disabled && styles.wrapDisabled]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => updateByDelta(-step)}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>-</Text>
      </Pressable>
      <TextInput
        editable={!disabled}
        keyboardType="decimal-pad"
        onBlur={applyDraft}
        onChangeText={setDraft}
        style={styles.input}
        value={draft}
      />
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => updateByDelta(step)}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  wrapDisabled: {
    opacity: 0.55,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceDisabled,
  },
  buttonText: {
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    color: colors.textStrong,
    fontWeight: '700',
  },
  input: {
    minWidth: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    backgroundColor: colors.surface,
  },
});
