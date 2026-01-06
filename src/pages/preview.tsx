import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
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
  const {
    selectedProduct,
    selectedColor,
    selectedPrint,
    printBackEnabled,
    setSelectedColor,
    designImageUri,
    imageTransform,
    textLayer,
    textTransform,
  } = useCatalog();
  const filteredShots = printBackEnabled ? mockupShots : mockupShots.slice(0, 1);

  const goDesigns = () => {
    navigation.navigate('/designs');
  };

  const goOrder = () => {
    navigation.navigate('/order');
  };

  return (
    <Screen>
      <TopBar title="완성 미리보기" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>{selectedProduct.name}</Text>
      <Text style={styles.subtitle}>색상별 미리보기를 확인하세요</Text>

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
              designImageUri={designImageUri}
              imageTransform={imageTransform}
              textLayer={textLayer}
              textTransform={textTransform}
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
        <PrimaryButton label="주문 요청" onPress={goOrder} style={styles.actionButton} />
        <SecondaryButton label="저장하기" onPress={goDesigns} style={styles.actionButton} />
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
