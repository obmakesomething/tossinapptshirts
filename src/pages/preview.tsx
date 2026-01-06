import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import {
  Card,
  ColorSwatch,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { MockupCanvas } from '../components/MockupCanvas';
import { buildTemplate } from '../data/mockupTemplates';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';

export const Route = createRoute('/preview', {
  component: Page,
});

const mockupShots = ['Front', 'Back'];

function Page() {
  const navigation = Route.useNavigation();
  const { selectedProduct, selectedColor, selectedPrint, setSelectedColor } = useCatalog();
  const [placement, setPlacement] = useState<'front' | 'back' | 'both'>('both');

  const filteredShots =
    placement === 'both'
      ? mockupShots
      : mockupShots.filter((shot) =>
          placement === 'front' ? shot !== 'Back' : shot !== 'Front'
        );

  const goDesigns = () => {
    navigation.navigate('/designs');
  };

  return (
    <Screen>
      <TopBar title="목업 미리보기" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>{selectedProduct.name}</Text>
      <Text style={styles.subtitle}>색상별 목업을 확인하세요</Text>

      <View style={styles.placementRow}>
        {[
          { label: '앞면', value: 'front' as const },
          { label: '뒷면', value: 'back' as const },
          { label: '전체', value: 'both' as const },
        ].map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setPlacement(item.value)}
            style={[
              styles.placementChip,
              placement === item.value && styles.placementChipSelected,
            ]}
          >
            <Text
              style={[
                styles.placementText,
                placement === item.value && styles.placementTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filteredShots.map((label, index) => (
          <Card key={label} style={[styles.mockupCard, index > 0 && styles.mockupSpacing]}>
            <MockupCanvas
              template={buildTemplate(
                selectedProduct,
                selectedColor,
                label === 'Back' ? 'back' : 'front'
              )}
              width={180}
              height={220}
              showDesign
              designScale={selectedPrint.designScale}
            />
            <Text style={styles.mockupLabel}>{label} · Flat</Text>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>컬러 변경</Text>
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
        <Text style={styles.infoTitle}>파일 준비 완료</Text>
        <Text style={styles.infoDesc}>
          저장 후 언제든 다시 편집하거나 공유할 수 있어요.
        </Text>
      </Card>

      <View style={styles.actionRow}>
        <PrimaryButton label="저장하기" onPress={goDesigns} style={styles.actionButton} />
        <SecondaryButton label="공유하기" onPress={() => {}} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  placementRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  placementChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  placementChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  placementText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  placementTextSelected: {
    color: theme.colors.primary,
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
    marginTop: theme.spacing.sm,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionRow: {
    marginTop: theme.spacing.lg,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
});
