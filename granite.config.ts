import { appsInToss } from '@apps-in-toss/framework/plugins';
import { hermes } from '@granite-js/plugin-hermes';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'merchandisegpt',
  scheme: 'intoss',
  plugins: [
    router(),
    hermes(),
    appsInToss({
      brand: {
        displayName: '머천다이즈 Gpt',
        primaryColor: '#3182F6',
        icon: './assets/logo.jpg',
      },
      permissions: [
        {
          name: 'photos',
          access: 'read',
        },
      ],
    }),
  ],
});
