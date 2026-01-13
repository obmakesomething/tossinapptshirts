import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, TopBar, theme } from '../components/ui';
import { faqItems } from '../data/faq';

export const Route = createRoute('/faq', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Group FAQs by category
  const categories = [
    '전체',
    ...new Set(faqItems.map((item) => item.category).filter(Boolean)),
  ];
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const filteredItems =
    selectedCategory === '전체'
      ? faqItems
      : faqItems.filter((item) => item.category === selectedCategory);

  return (
    <Screen>
      <TopBar title="자주 묻는 질문" onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle}>궁금하신 내용을 확인해보세요</Text>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <Card key={item.id} style={styles.faqCard}>
              <Pressable onPress={() => toggleExpand(item.id)}>
                <View style={styles.questionRow}>
                  <Text style={styles.qLabel}>Q</Text>
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Text style={styles.expandIcon}>
                    {isExpanded ? '−' : '+'}
                  </Text>
                </View>
                {isExpanded && (
                  <View style={styles.answerRow}>
                    <Text style={styles.aLabel}>A</Text>
                    <Text style={styles.answerText}>{item.answer}</Text>
                  </View>
                )}
              </Pressable>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  categoryScroll: {
    marginBottom: theme.spacing.md,
  },
  categoryScrollContent: {
    paddingRight: theme.spacing.md,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: theme.colors.surface,
  },
  faqCard: {
    marginBottom: theme.spacing.sm,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  qLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  expandIcon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  aLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  answerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
});
