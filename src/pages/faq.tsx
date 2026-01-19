import { createRoute } from '@granite-js/react-native';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, Screen, TopBar, theme } from '../components/ui';
import { faqCategories, faqItems } from '../data/faq';

export const Route = createRoute('/faq', {
  component: Page,
});

function Page() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<{ [key: string]: number }>({});

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const scrollToCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      const yOffset = categoryRefs.current[categoryId];
      if (yOffset !== undefined) {
        scrollViewRef.current?.scrollTo({ y: yOffset - 10, animated: true });
      }
    }
  };

  const handleLayout = (categoryId: string, y: number) => {
    categoryRefs.current[categoryId] = y;
  };

  const filteredItems =
    selectedCategory === 'all'
      ? faqItems
      : faqItems.filter((item) => item.category === selectedCategory);

  const groupedItems = selectedCategory === 'all'
    ? faqCategories.map((cat) => ({
      ...cat,
      items: faqItems.filter((item) => item.category === cat.id),
    }))
    : [
      {
        ...faqCategories.find((c) => c.id === selectedCategory)!,
        items: filteredItems,
      },
    ];

  return (
    <Screen>
      <TopBar title="자주 묻는 질문" />

      <Text style={styles.subtitle}>
        찾으시는 내용이 있으신가요?
      </Text>

      {/* Category Navigation Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <Pressable
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && styles.categoryChipActive,
          ]}
          onPress={() => scrollToCategory('all')}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'all' && styles.categoryTextActive,
            ]}
          >
            전체
          </Text>
        </Pressable>
        {faqCategories.map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => scrollToCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.icon} {category.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* FAQ Content */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {groupedItems.map((group) => (
          <View
            key={group.id}
            onLayout={(e) => handleLayout(group.id, e.nativeEvent.layout.y)}
          >
            {/* Category Header */}
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryHeaderIcon}>{group.icon}</Text>
              <Text style={styles.categoryHeaderTitle}>{group.title}</Text>
              <Text style={styles.categoryCount}>{group.items.length}개</Text>
            </View>

            {/* FAQ Items */}
            {group.items.map((item) => {
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
          </View>
        ))}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
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
    maxHeight: 44,
    marginBottom: theme.spacing.md,
  },
  categoryScrollContent: {
    paddingRight: theme.spacing.md,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
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
    lineHeight: 18,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryHeaderIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  categoryHeaderTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  categoryCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
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
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: 40,
  },
});
