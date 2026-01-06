import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import {
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';

export const Route = createRoute('/upload', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const [removeBackground, setRemoveBackground] = useState(true);

  const goNext = () => {
    navigation.navigate('/editor');
  };

  const goGenerate = () => {
    navigation.navigate('/generate');
  };

  return (
    <Screen>
      <TopBar title="이미지 업로드" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>파일을 선택해 바로 목업을 만들어요</Text>
      <Text style={styles.subtitle}>
        PNG/JPG 최대 10MB, 가로 4096px 이하 권장
      </Text>

      <Card style={styles.uploadCard}>
        <View style={styles.uploadPreview} />
        <SecondaryButton label="파일 선택" onPress={() => {}} />
        <Text style={styles.helperText}>투명 배경 PNG면 자동 유지돼요.</Text>
      </Card>

      <Card style={styles.optionCard}>
        <View style={styles.optionRow}>
          <View>
            <Text style={styles.optionTitle}>배경 제거</Text>
            <Text style={styles.optionDesc}>
              인물/사물 배경을 제거해 깔끔하게 만들어요.
            </Text>
          </View>
          <Switch
            value={removeBackground}
            onValueChange={setRemoveBackground}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.previewRow}>
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>원본</Text>
          </View>
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>배경 제거</Text>
          </View>
        </View>
      </Card>

      <View style={styles.actionRow}>
        <PrimaryButton label="편집으로 이동" onPress={goNext} style={styles.actionButton} />
        <SecondaryButton label="Imagen으로 생성" onPress={goGenerate} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  uploadCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  uploadPreview: {
    width: '100%',
    height: 160,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
  },
  optionCard: {
    marginBottom: theme.spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    width: 220,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewBox: {
    width: '48%',
    height: 120,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actionRow: {
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
});
