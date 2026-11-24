import { Outlet, ScrollRestoration } from 'react-router';
import { Cursor, Grain } from '@/design';

export function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
      <Grain />
      <Cursor />
    </>
  );
}
