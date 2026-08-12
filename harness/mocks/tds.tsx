/**
 * Stand-in for @toss/tds-react-native.
 *
 * TDS reaches into react-native's Flow-typed internals, which a web bundler
 * cannot parse. These are plain react-native-web equivalents with the same prop
 * surface the app uses.
 *
 * They approximate TDS rather than reproduce it: anything rendered through
 * these (the editor's text field, the address search modal) is close but not
 * pixel-accurate, so judge those two surfaces on the device, not here.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const TDSProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const Txt = ({ children, style, ...rest }: any) => (
  <Text style={[s.txt, style]} {...rest}>
    {children}
  </Text>
);

export const Button = ({ children, onPress, style, ...rest }: any) => (
  <Pressable onPress={onPress} style={[s.button, style]} {...rest}>
    <Text style={s.buttonText}>{children}</Text>
  </Pressable>
);

export const TextField = ({ value, onChangeText, placeholder, style, ...rest }: any) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#8B95A1"
    style={[s.field, style]}
    {...rest}
  />
);

export const SearchField = TextField;

export const List = ({ children, style }: any) => <View style={[s.list, style]}>{children}</View>;

List.Row = ({ children, style }: any) => <View style={[s.row, style]}>{children}</View>;

export const ListRow = ({ contents, onPress, style }: any) => (
  <Pressable onPress={onPress} style={[s.row, style]}>
    {typeof contents === 'string' ? <Text style={s.txt}>{contents}</Text> : contents}
  </Pressable>
);

const s = StyleSheet.create({
  txt: { fontSize: 15, color: '#191F28' },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1B64DA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  field: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#191F28',
  },
  list: { backgroundColor: '#FFFFFF', borderRadius: 12 },
  row: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F6',
  },
});
