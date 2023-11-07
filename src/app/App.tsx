import React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import I18n from '../components/i18n/I18n';
import AppLayout from './appLayout/AppLayout';
import { AppRoutes } from './routes';

import './app.css';

const queryClient = new QueryClient();

const getLocale = () => {
  const locale = {
    value: process.env.REACT_APP_CONFIG_SERVICE_LOCALES_DEFAULT_LNG,
    key: process.env.REACT_APP_CONFIG_SERVICE_LOCALES_DEFAULT_LNG_DESC
  };
  return locale;
};

const App: React.FC = () => {
  const locale = getLocale();

  return (
    <I18n locale={locale.value}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </QueryClientProvider>
      </BrowserRouter>
    </I18n>
  );
};

export default App;
