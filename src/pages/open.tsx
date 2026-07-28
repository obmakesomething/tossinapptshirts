import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const Route = createRoute('/open', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;
    navigation.replace('/', {});
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#1B64DA" />
      <Text style={styles.text}>앱을 여는 중이에요...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    color: '#8B95A1',
    fontSize: 14,
  },
});
