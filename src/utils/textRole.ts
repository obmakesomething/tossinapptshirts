import type { TextProps } from 'react-native';

/**
 * Name a text element's role for anything reading the rendered DOM.
 *
 * React Native has no `<h1>` or `<p>`, and react-native-web renders every
 * `Text` as a `div` with generated class names. So a UX audit — or any tool
 * that reads structure off the page — cannot tell a lead paragraph from a
 * caption, however clearly a person reading the screen can. `dataSet` is the
 * one channel that survives: it becomes `data-fga-role`, which fga-engine reads
 * as an explicit declaration rather than a guess.
 *
 * This is inert on iOS and Android. It makes existing structure legible to
 * tooling; it does not change the app. Headings are different — those use
 * `accessibilityRole="header"`, which real screen readers act on.
 *
 * `dataSet` is a react-native-web prop and is absent from React Native's own
 * TextProps, hence the assertion here rather than at each call site.
 */
export function textRole(role: 'lead' | 'helper' | 'meta'): Partial<TextProps> {
  return { dataSet: { fgaRole: role } } as unknown as Partial<TextProps>;
}
