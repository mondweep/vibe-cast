import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { Footer } from '@/components/common/Footer';
import { DashboardPage } from '@/pages/DashboardPage';
import { EnrollmentPage } from '@/pages/EnrollmentPage';
import { ExamPage } from '@/pages/ExamPage';
import { BadgesPage } from '@/pages/BadgesPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { Loader } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin text-primary-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin text-primary-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/enrollment"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EnrollmentPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/exam/:enrollmentId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ExamPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/badges"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BadgesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LeaderboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Public Routes - Placeholder */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Sign In
              </h1>
              <p className="text-gray-600 mb-4">
                Sign in with Supabase to continue
              </p>
              <p className="text-sm text-gray-500 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                Login UI would be implemented using Supabase Auth
              </p>
            </div>
          </AuthLayout>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
