import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './components/AppLayout';
import PerformanceMonitor from './components/PerformanceMonitor';
import './utils/WebSocketTest'; // Import WebSocket test

// Lazy-loaded page components for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Workflow = React.lazy(() => import('./pages/Workflow'));
const Blockchain = React.lazy(() => import('./pages/Blockchain'));

// Loading fallback component for lazy routes
const PageLoadingFallback: React.FC = () => (
  <div className='min-h-screen flex items-center justify-center'>
    <LoadingSpinner size='lg' />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path='/'
            element={<AppLayout />}
            errorElement={<RouteErrorBoundary />}
          >
            {/* Dashboard Route */}
            <Route
              index
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Dashboard />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            {/* Orders Route */}
            <Route
              path='orders'
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Orders />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            {/* Workflow Route */}
            <Route
              path='workflow'
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Workflow />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            {/* Blockchain Route */}
            <Route
              path='blockchain'
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Blockchain />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            {/* Catch-all redirect to dashboard */}
            <Route path='*' element={<Navigate to='/' replace />} />
          </Route>
        </Routes>

        {/* Performance Monitor (Development Only) */}
        <PerformanceMonitor />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
