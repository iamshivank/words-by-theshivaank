import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
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
    // Shown for the split second before the first lazy page arrives.
    HydrateFallback: () => null,
    children: [
      // Public
      {
        index: true,
        lazy: () =>
          import('@/features/landing/LandingPage').then((m) => ({ Component: m.LandingPage })),
      },
      {
        path: 'writing',
        lazy: () =>
          import('@/features/reading/WritingIndexPage').then((m) => ({
            Component: m.WritingIndexPage,
          })),
      },
      {
        path: 'writing/:slug',
        lazy: () =>
          import('@/features/reading/ReadingPage').then((m) => ({ Component: m.ReadingPage })),
      },
      {
        path: 'archive',
        lazy: () =>
          import('@/features/reading/ArchivePage').then((m) => ({ Component: m.ArchivePage })),
      },
      {
        path: 'about',
        lazy: () =>
          import('@/features/reading/AboutPage').then((m) => ({ Component: m.AboutPage })),
      },
      {
        path: 'login',
        lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })),
      },

      // The editor is full screen, outside the Desk chrome.
      {
        path: 'desk/write/:id',
        lazy: () =>
          import('@/features/editor/EditorPage').then((m) => ({ Component: m.EditorPage })),
      },

      // Private
      {
        path: 'desk',
        lazy: () => import('@/features/desk/DeskLayout').then((m) => ({ Component: m.DeskLayout })),
        children: [
          {
            index: true,
            lazy: () => import('@/features/desk/DeskPage').then((m) => ({ Component: m.DeskPage })),
          },
          {
            path: 'journal',
            lazy: () =>
              import('@/features/desk/EntriesPage').then((m) => ({
                Component: () => <m.EntriesPage type="journal" />,
              })),
          },
          {
            path: 'essays',
            lazy: () =>
              import('@/features/desk/EntriesPage').then((m) => ({
                Component: () => <m.EntriesPage type="essay" />,
              })),
          },
          {
            path: 'notes',
            lazy: () =>
              import('@/features/desk/EntriesPage').then((m) => ({
                Component: () => <m.EntriesPage type="note" />,
              })),
          },
          {
            path: 'decisions',
            lazy: () =>
              import('@/features/decisions/DecisionsPage').then((m) => ({
                Component: m.DecisionsPage,
              })),
          },
          {
            path: 'review',
            lazy: () =>
              import('@/features/reviews/ReviewPage').then((m) => ({ Component: m.ReviewPage })),
          },
          {
            path: 'goals',
            lazy: () =>
              import('@/features/goals/GoalsPage').then((m) => ({ Component: m.GoalsPage })),
          },
          {
            path: 'quotes',
            lazy: () =>
              import('@/features/quotes/QuotesPage').then((m) => ({ Component: m.QuotesPage })),
          },
          {
            path: 'admin/:tab?',
            lazy: () =>
              import('@/features/admin/AdminPage').then((m) => ({ Component: m.AdminPage })),
          },
          { path: 'settings', element: <Navigate to="/desk/admin/preferences" replace /> },
        ],
      },
      ...devOnly,
      {
        path: '*',
        lazy: () => import('@/features/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
      },
    ],
  },
]);
