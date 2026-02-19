import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthSync } from '../hooks/useAuthSync';
import { Loader } from '../components/Loader';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage').then((module) => ({ default: module.FavoritesPage })));
const ComparisonPage = lazy(() => import('../pages/ComparisonPage').then((module) => ({ default: module.ComparisonPage })));
const PortfolioPage = lazy(() => import('../pages/PortfolioPage').then((module) => ({ default: module.PortfolioPage })));
const PricingPage = lazy(() => import('../pages/PricingPage').then((module) => ({ default: module.PricingPage })));
const BillingPage = lazy(() => import('../pages/BillingPage').then((module) => ({ default: module.BillingPage })));
const AuthPage = lazy(() => import('../pages/AuthPage').then((module) => ({ default: module.AuthPage })));

export const AppRouter = (): JSX.Element => {
  useAuthSync();

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
