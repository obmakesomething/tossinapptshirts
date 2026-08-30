import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, Chevron, Chip, PageHeader, Screen, theme } from '../components/ui';
import { faqCategories, faqItems } from '../data/faq';

const ACCENT = '#1B64DA';
const PAGE_BG = '#F2F4F6';
const PANEL = '#FFFFFF';

export const Route = createRoute('/faq', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  /**
   * Categories filter the list in place — the page keeps a single scroll
   * container so the list never scrolls inside another scroll view.
   */
  const groupedItems =
    selectedCategory === 'all'
      ? faqCategories.map((cat) => ({
          ...cat,
          items: faqItems.filter((item) => item.category === cat.id),
        }))
      : faqCategories
          .filter((cat) => cat.id === selectedCategory)
          .map((cat) => ({
            ...cat,
            items: faqItems.filter((item) => item.category === cat.id),
          }));

  return (
    <Screen contentStyle={styles.screenContent}>
      <PageHeader
        title="자주 묻는 질문"
        subtitle="제작부터 배송까지 궁금한 점을 모았어요"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <Chip
          label="전체"
          selected={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          style={styles.categoryChip}
        />
        {faqCategories.map((category) => (
          <Chip
            key={category.id}
            label={category.title}
            selected={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
            style={styles.categoryChip}
          />
        ))}
      </ScrollView>

      {groupedItems.map((group) => (
        <View key={group.id}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderTitle}>{group.title}</Text>
            <Text style={styles.categoryCount}>{group.items.length}</Text>
          </View>

          <Card style={styles.faqCard}>
            {group.items.map((item, idx) => {
              const isExpanded = expandedId === item.id;
              const isLast = idx === group.items.length - 1;
              return (
                <View key={item.id}>
                  <Pressable
                    onPress={() => toggleExpand(item.id)}
                    style={({ pressed }) => [styles.faqItem, pressed && styles.faqItemPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={item.question}
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <View style={styles.questionRow}>
                      <Text style={styles.qLabel}>Q</Text>
                      <Text style={styles.questionText}>{item.question}</Text>
                      <View style={styles.expandIcon}>
                        <Chevron direction={isExpanded ? 'up' : 'down'} size={8} />
                      </View>
                    </View>
                    {isExpanded && (
                      <View style={styles.answerRow}>
                        <Text style={styles.aLabel}>A</Text>
                        <Text style={styles.answerText}>{item.answer}</Text>
                      </View>
                    )}
                  </Pressable>
                  {!isLast && <View style={styles.faqDivider} />}
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: PAGE_BG,
  },
  categoryScroll: {
    marginBottom: theme.spacing.lg,
  },
  categoryScrollContent: {
    paddingRight: theme.spacing.xl,
    alignItems: 'center',
  },
  categoryChip: {
    marginRight: theme.spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  categoryHeaderTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  categoryCount: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
  },
  faqCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: PANEL,
    paddingVertical: theme.spacing.xs,
  },
  faqItem: {
    paddingVertical: theme.spacing.lg,
  },
  faqItemPressed: {
    opacity: 0.6,
  },
  faqDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  qLabel: {
    ...theme.typography.bodyStrong,
    fontWeight: '700',
    color: ACCENT,
    marginRight: theme.spacing.md,
  },
  questionText: {
    flex: 1,
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  expandIcon: {
    width: 20,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  aLabel: {
    ...theme.typography.bodyStrong,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    marginRight: theme.spacing.md,
  },
  answerText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
