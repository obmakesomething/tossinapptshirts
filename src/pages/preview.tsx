import { share, getTossShareLink } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import { Button } from '@toss/tds-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import {
  Card,
  ColorSwatch,
  Screen,
  TopBar,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate } from '../data/mockupTemplates';

export const Route = createRoute('/preview', {
  component: Page,
});

const mockupShots = ['Front', 'Back'];

function Page() {
  const navigation = Route.useNavigation();
  const {
    selectedProduct,
    selectedColor,
    printBackEnabled,
    setSelectedColor,
    frontDesignImageUri,
    frontImageTransform,
    frontTextLayer,
    frontTextTransform,
    backDesignImageUri,
    backImageTransform,
    backTextLayer,
    backTextTransform,
    saveCurrentDesign,
  } = useCatalog();
  const [saving, setSaving] = useState(false);
  const filteredShots = printBackEnabled
    ? mockupShots
    : mockupShots.slice(0, 1);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const title = `${selectedProduct.name} - ${selectedColor}`;
      await saveCurrentDesign(title);
      // Designs list will auto-refresh via useEffect in designs.tsx
      Alert.alert('저장 완료', '디자인을 저장했어요!', [
        {
          text: '확인',
          onPress: () => navigation.navigate('/designs'),
        },
      ]);
    } catch {
      Alert.alert('저장 실패', '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const ogImageUrl = frontDesignImageUri || undefined;
      const shareLink = await getTossShareLink('intoss://merchandisegpt/preview', ogImageUrl);
      await share({
        message: `${selectedProduct.name} 디자인을 확인해보세요! 🎨\n${shareLink}`,
      });
    } catch {
      // User cancelled or share failed - ignore
    }
  };

  const goOrder = () => {
    navigation.navigate('/order');
  };

  return (
    <Screen>
      <TopBar title="완성 미리보기" />

      <Text style={styles.title}>{selectedProduct.name}</Text>
      <Text style={styles.subtitle}>다른 색상으로도 확인해 보세요</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filteredShots.map((label, index) => {
          const isBack = label === 'Back';
          return (
            <Card
              key={label}
              style={[styles.mockupCard, index > 0 && styles.mockupSpacing]}
            >
              <MockupCanvas
                template={buildTemplate(
                  selectedProduct,
                  selectedColor,
                  isBack ? 'back' : 'front',
                )}
                width={220}
                height={275}
                showDesign
                designImageUri={
                  isBack ? backDesignImageUri : frontDesignImageUri
                }
                imageTransform={
                  isBack ? backImageTransform : frontImageTransform
                }
                textLayer={isBack ? backTextLayer : frontTextLayer}
                textTransform={isBack ? backTextTransform : frontTextTransform}
              />
              <Text style={styles.mockupLabel}>{label} · Flat</Text>
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>색상 바꿔보기</Text>
        <View style={styles.swatchRow}>
          {selectedProduct.colors.map((color) => (
            <ColorSwatch
              key={color}
              label={color}
              color={resolveColorValue(color)}
              selected={selectedColor === color}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>파일 준비가 완료됐어요</Text>
        <Text style={styles.infoDesc}>
          저장한 뒤 언제든 다시 편집하거나 공유할 수 있어요.
        </Text>
      </Card>

      <View style={styles.actionRow}>
        <View style={styles.flex1}>
          <Button type="primary" size="medium" onPress={goOrder}>
            주문하기
          </Button>
        </View>
        <View style={styles.flex1}>
          <Button
            type="light"
            size="medium"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? '저장하고 있어요...' : '저장하기'}
          </Button>
        </View>
        <View style={styles.flex1}>
          <Button type="light" size="medium" onPress={handleShare}>
            공유하기
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  mockupCard: {
    width: 220,
    alignItems: 'center',
  },
  mockupSpacing: {
    marginLeft: theme.spacing.md,
  },
  mockupLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.successBorder,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.success,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  infoDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actionRow: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
});
