import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { MockupCanvas } from '../components/MockupCanvas';
import { buildTemplate } from '../data/mockupTemplates';
import { useCatalog } from '../context/catalog';

export const Route = createRoute('/designs', {
  component: Page,
});

const designs: { id: string; title: string; meta: string; color: string }[] = [
  { id: '1', title: 'Ocean Wave Tee', meta: 'Black / M · 2시간 전', color: '블랙' },
  { id: '2', title: 'Minimal Flower', meta: 'White / L · 어제', color: '화이트' },
];

function Page() {
  const navigation = Route.useNavigation();
  const { selectedProduct } = useCatalog();

  const goHome = () => {
    navigation.navigate('/');
  };

  const goEditor = () => {
    navigation.navigate('/editor');
  };

  return (
    <Screen>
      <TopBar title="내 디자인" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>저장된 목업을 다시 편집하거나 공유하세요</Text>

      <View style={styles.list}>
        {designs.map((item) => (
          <Card key={item.id} style={styles.designCard}>
            <MockupCanvas
              template={buildTemplate(selectedProduct, item.color, 'front')}
              width={72}
              height={90}
              showDesign
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.meta}</Text>
              <View style={styles.cardActions}>
                <SecondaryButton label="다시 편집" onPress={goEditor} style={styles.cardButton} />
                <SecondaryButton label="공유" onPress={() => {}} />
              </View>
            </View>
          </Card>
        ))}
      </View>

      <PrimaryButton label="새 디자인 만들기" onPress={goHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  list: {
    marginBottom: theme.spacing.xl,
  },
  designCard: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardButton: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
});
