import { AppsInToss } from '@apps-in-toss/framework';
import type { InitialProps } from '@granite-js/react-native';
import { TDSProvider } from '@toss/tds-react-native';
import React, { type PropsWithChildren } from 'react';
import { context } from '../require.context';
import { CatalogProvider } from './context/catalog';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <TDSProvider>
      <CatalogProvider>{children}</CatalogProvider>
    </TDSProvider>
  );
}

export default AppsInToss.registerApp(AppContainer, { context });
