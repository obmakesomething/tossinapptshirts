import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import { hermes } from '@granite-js/plugin-hermes';
import { router } from '@granite-js/plugin-router';

export default defineConfig({
  appName: 'merchandisegpt',
  scheme: 'intoss',
  web: {
    host: 'localhost',
    port: 8081,
  },
  outdir: 'dist',
  plugins: [
    router(),
    hermes(),
    appsInToss({
      brand: {
        displayName: '굿즈 GPT',
        primaryColor: '#3182F6',
        icon: 'https://static.toss.im/appsintoss/14401/d0c0ede6-31b9-400d-b236-196c02293df1.png',
      },
      webViewProps: { type: 'partner' },
      permissions: [
        {
          name: 'photos',
          access: 'read',
        },
      ],
    }),
  ],
});
