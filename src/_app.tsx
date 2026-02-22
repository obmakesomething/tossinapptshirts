import { AppsInToss } from '@apps-in-toss/framework';
import type { InitialProps } from '@granite-js/react-native';
import React, { type PropsWithChildren } from 'react';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { context } from '../require.context';
import { CatalogProvider } from './context/catalog';
import { JobTrackerProvider } from './context/jobTracker';
import { ToastProvider } from './context/toastContext';
import { ToastContainer } from './components/toast';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <TDSMobileAITProvider>
      <ToastProvider>
        <JobTrackerProvider>
          <CatalogProvider>
            {children}
            <ToastContainer />
          </CatalogProvider>
        </JobTrackerProvider>
      </ToastProvider>
    </TDSMobileAITProvider>
  );
}

export default AppsInToss.registerApp(AppContainer, { context });
