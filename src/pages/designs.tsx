import { share, getTossShareLink } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import {
  Card,
  DangerButton,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { type SavedDesign, useCatalog } from '../context/catalog';
import { catalogProducts } from '../data/catalog';
import { buildTemplate } from '../data/mockupTemplates';

export const Route = createRoute('/designs', {
  component: Page,
});

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return '방금';
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays === 1) return '어제';
  return `${diffDays}일 전`;
}

function Page() {
  const navigation = Route.useNavigation();
  const { savedDesigns, loadDesign, deleteDesign, refreshSavedDesigns } =
    useCatalog();

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

  const handlePreview = (design: SavedDesign) => {
    loadDesign(design);
    navigation.navigate('/preview');
  };

  const handleShare = async (design: SavedDesign) => {
    const product = catalogProducts.find((p) => p.id === design.productId);
    const productName = product?.name ?? '티셔츠';
    try {
      const ogImageUrl = design.designImageUri || undefined;
      const shareLink = await getTossShareLink('intoss://merchandisegpt/designs', ogImageUrl);
      await share({
        message: `${design.title} - ${productName} 디자인을 확인해보세요! 🎨\n${shareLink}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleDelete = (design: SavedDesign) => {
    Alert.alert('삭제할까요?', `"${design.title}" 디자인을 삭제하면 복구할 수 없어요.`, [
      { text: '취소할게요', style: 'cancel' },
      {
        text: '삭제하기',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDesign(design.id);
          } catch {
            Alert.alert('삭제 실패', '삭제하지 못했어요. 다시 시도해 주세요.');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <TopBar title="내 디자인" />

      <Text style={styles.title}>
        저장한 디자인이에요. 다시 편집하거나 공유할 수 있어요.
      </Text>

      <View style={styles.list}>
        {savedDesigns.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>아직 저장한 디자인이 없어요</Text>
            <Text style={styles.emptySubtext}>
              미리보기 화면에서 디자인을 저장해 보세요
            </Text>
          </Card>
        ) : (
          savedDesigns.map((design) => {
            const product = catalogProducts.find(
              (p) => p.id === design.productId,
            );
            const displayProduct = product ?? catalogProducts[0];
            if (!displayProduct) return null;

            return (
              <Card key={design.id} style={styles.designCard}>
                <MockupCanvas
                  template={buildTemplate(
                    displayProduct,
                    design.color,
                    'front',
                  )}
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
                    <PrimaryButton
                      label="미리보기"
                      onPress={() => handlePreview(design)}
                      style={styles.cardButton}
                    />
                    <SecondaryButton
                      label="편집하기"
                      onPress={() => handleEdit(design)}
                      style={styles.cardButton}
                    />
                    <SecondaryButton
                      label="공유하기"
                      onPress={() => handleShare(design)}
                      style={styles.cardButton}
                    />
                    <DangerButton
                      label="삭제하기"
                      onPress={() => handleDelete(design)}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>

      <PrimaryButton label="새로 만들기" onPress={goHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
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
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
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
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
