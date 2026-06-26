// pages/_app.js  — REPLACE ENTIRE FILE

import { RoleProvider } from '../lib/useRole';

export default function App({ Component, pageProps }) {
  return (
    <RoleProvider>
      <Component {...pageProps} />
    </RoleProvider>
  );
}
