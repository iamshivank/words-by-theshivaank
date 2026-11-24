import { createBrowserRouter, type RouteObject } from 'react-router';
import { RootLayout } from './RootLayout';

const devOnly: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'design',
        lazy: () =>
          import('@/features/styleguide/StyleGuidePage').then((m) => ({
            Component: m.StyleGuidePage,
          })),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        index: true,
        lazy: () => import('@/features/home/HomePage').then((m) => ({ Component: m.HomePage })),
      },
      {
        path: 'login',
        lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })),
      },
      {
        path: 'desk',
        lazy: () => import('@/features/desk/DeskPage').then((m) => ({ Component: m.DeskPage })),
      },
      ...devOnly,
      {
        path: '*',
        lazy: () => import('@/features/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
      },
    ],
  },
]);
