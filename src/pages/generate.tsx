import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Chip, PrimaryButton, Screen, TopBar, theme, Card } from '../components/ui';

export const Route = createRoute('/generate', {
  component: Page,
});

const styleOptions = ['미니멀', '라인아트', '그래픽'];
const ratioOptions = ['1:1', '4:3', '3:4'];

function Page() {
  const navigation = Route.useNavigation();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(styleOptions[0]);
  const [ratio, setRatio] = useState(ratioOptions[0]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const goNext = () => {
    navigation.navigate('/editor');
  };

  return (
    <Screen>
      <TopBar title="Imagen 생성" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>이미지를 생성할 프롬프트를 입력하세요</Text>
      <TextInput
        style={styles.input}
        placeholder="예: A clean vector-style illustration of a wave..."
        placeholderTextColor={theme.colors.muted}
        value={prompt}
        onChangeText={setPrompt}
        multiline
      />
      <Text style={styles.helperText}>영문 프롬프트 기준으로 가장 품질이 좋아요.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>스타일</Text>
        <View style={styles.chipRow}>
          {styleOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={style === option}
              onPress={() => setStyle(option)}
              style={styles.chipSpacing}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>비율</Text>
        <View style={styles.chipRow}>
          {ratioOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={ratio === option}
              onPress={() => setRatio(option)}
              style={styles.chipSpacing}
            />
          ))}
        </View>
      </View>

      <PrimaryButton label="생성하기" onPress={() => {}} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>생성 결과</Text>
        <View style={styles.grid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Pressable
              key={`result-${index}`}
              onPress={() => setSelectedIndex(index)}
              style={[
                styles.gridItem,
                selectedIndex === index && styles.gridItemSelected,
              ]}
            >
              <Card style={styles.gridCard}>
                <Text style={styles.gridLabel}>Result {index + 1}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>

      <PrimaryButton label="선택 완료" onPress={goNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipSpacing: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  gridItem: {
    width: '48%',
    marginBottom: theme.spacing.sm,
  },
  gridItemSelected: {
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  gridCard: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
