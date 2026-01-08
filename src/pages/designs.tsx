import { createRoute } from '@granite-js/react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { share } from '@apps-in-toss/framework';
import {
  Card,
  DangerButton,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { MockupCanvas } from '../components/MockupCanvas';
import { buildTemplate } from '../data/mockupTemplates';
import { useCatalog, type SavedDesign } from '../context/catalog';
import { catalogProducts } from '../data/catalog';

export const Route = createRoute('/designs', {
  component: Page,
});

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays === 1) return '어제';
  return `${diffDays}일 전`;
}

function Page() {
  const navigation = Route.useNavigation();
  const { savedDesigns, loadDesign, deleteDesign, refreshSavedDesigns } = useCatalog();

  useEffect(() => {
    refreshSavedDesigns();
  }, [refreshSavedDesigns]);

  const goHome = () => {
    navigation.navigate('/');
  };

  const handleEdit = (design: SavedDesign) => {
    loadDesign(design);
    navigation.navigate('/editor');
  };

  const handleShare = async (design: SavedDesign) => {
    const product = catalogProducts.find((p) => p.id === design.productId);
    const productName = product?.name ?? '티셔츠';
    try {
      await share({
        message: `${design.title} - ${productName} 디자인을 확인해보세요! 🎨`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleDelete = (design: SavedDesign) => {
    Alert.alert('삭제 확인', `"${design.title}" 디자인을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDesign(design.id);
          } catch {
            Alert.alert('삭제 실패', '다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <TopBar title="내 디자인" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>저장된 디자인을 다시 편집하거나 공유하세요</Text>

      <View style={styles.list}>
        {savedDesigns.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>저장된 디자인이 없습니다</Text>
            <Text style={styles.emptySubtext}>미리보기 화면에서 디자인을 저장해보세요</Text>
          </Card>
        ) : (
          savedDesigns.map((design) => {
            const product = catalogProducts.find((p) => p.id === design.productId);
            const displayProduct = product ?? catalogProducts[0];
            if (!displayProduct) return null;

            return (
              <Card key={design.id} style={styles.designCard}>
                <MockupCanvas
                  template={buildTemplate(displayProduct, design.color, 'front')}
                  width={72}
                  height={90}
                  showDesign
                  designImageUri={design.designImageUri}
                  imageTransform={design.imageTransform}
                  textLayer={design.textLayer}
                  textTransform={design.textTransform}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{design.title}</Text>
                  <Text style={styles.cardMeta}>
                    {design.color} · {formatTimeAgo(design.createdAt)}
                  </Text>
                  <View style={styles.cardActions}>
                    <SecondaryButton label="다시 편집" onPress={() => handleEdit(design)} style={styles.cardButton} />
                    <SecondaryButton label="공유" onPress={() => handleShare(design)} style={styles.cardButton} />
                    <DangerButton label="삭제" onPress={() => handleDelete(design)} />
                  </View>
                </View>
              </Card>
            );
          })
        )}
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
