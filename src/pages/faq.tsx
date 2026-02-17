import { createRoute } from '@granite-js/react-native';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, PageHeader, Screen, theme } from '../components/ui';
import { faqCategories, faqItems } from '../data/faq';

const ORANGE_RED = '#FF5000';
const NAVY_DEEP = '#071a35';
const NAVY_PANEL = '#15325d';

export const Route = createRoute('/faq', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
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
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="자주 묻는 질문" onBack={() => navigation.goBack()} />

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
  screenContent: {
    backgroundColor: NAVY_DEEP,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#eef5ff',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#dbeaff',
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.body,
    color: '#bfd3ef',
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
    backgroundColor: NAVY_PANEL,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255,80,0,0.2)',
    borderColor: ORANGE_RED,
  },
  categoryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#bfd3ef',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#ffe3d5',
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
    borderBottomColor: 'rgba(255,255,255,0.15)',
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
    color: '#eff6ff',
  },
  categoryCount: {
    fontSize: 12,
    color: '#b8cdee',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  faqCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: NAVY_PANEL,
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  qLabel: {
    ...theme.typography.body,
    fontWeight: '700',
    color: ORANGE_RED,
    marginRight: theme.spacing.sm,
  },
  questionText: {
    flex: 1,
    ...theme.typography.body,
    fontWeight: '600',
    color: '#eff6ff',
  },
  expandIcon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
    color: '#a8c2e6',
    marginLeft: theme.spacing.sm,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  aLabel: {
    ...theme.typography.body,
    fontWeight: '700',
    color: '#9fbce5',
    marginRight: theme.spacing.sm,
  },
  answerText: {
    flex: 1,
    ...theme.typography.body,
    color: '#c8dbf6',
  },
  bottomPadding: {
    height: 40,
  },
});
