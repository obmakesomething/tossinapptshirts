import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import { hermes } from '@granite-js/plugin-hermes';
import { router } from '@granite-js/plugin-router';

const createAitReactNativeConfig = <T extends Record<string, unknown>>(config: T) => ({
  outdir: 'dist',
  ...config,
});

export default defineConfig(createAitReactNativeConfig({
  appName: 'merchandisegpt',
  scheme: 'intoss',
  outdir: 'dist',
  plugins: [
    router(),
    hermes(),
    appsInToss({
      brand: {
        displayName: '굿즈 GPT',
        primaryColor: '#2A6ED4',
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
}));
