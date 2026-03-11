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
        displayName: '굿즈 GPT',
        primaryColor: '#FF6A00',
        icon: 'https://static.toss.im/appsintoss/14401/d0c0ede6-31b9-400d-b236-196c02293df1.png',
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
