import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { Footer } from '@/components/common/Footer';
import { TutorDrawer } from '@/components/common/TutorDrawer';
import { DashboardPage } from '@/pages/DashboardPage';
import { EnrollmentPage } from '@/pages/EnrollmentPage';
import { ExamPage } from '@/pages/ExamPage';
import { BadgesPage } from '@/pages/BadgesPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsPage } from '@/pages/TermsPage';
import { ContactPage } from '@/pages/ContactPage';
import { LearningPathsPage } from '@/pages/LearningPathsPage';
import { PathDetailPage } from '@/pages/PathDetailPage';
import { AdminCouponsPage } from '@/pages/AdminCouponsPage';
import { LessonPage } from '@/pages/LessonPage';
import { SkillLabPage } from '@/pages/SkillLabPage';
import { ExercisePage } from '@/pages/ExercisePage';
import { PatternsPage } from '@/pages/PatternsPage';
import { PatternDetailPage } from '@/pages/PatternDetailPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { Loader } from 'lucide-react';

// Lazy-loaded so the graph visualisation library only loads on this tab.
const KnowledgeGraphPage = React.lazy(() => import('@/pages/KnowledgeGraphPage'));

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
      <TutorDrawer />
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

// Public, readable layout for long-form content pages (legal, contact).
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</div>
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
        path="/paths"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LearningPathsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/paths/:pathId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PathDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/knowledge-graph"
        element={
          <ProtectedRoute>
            <AppLayout>
              <React.Suspense
                fallback={
                  <div className="flex justify-center py-24">
                    <Loader className="animate-spin text-primary-600" size={36} />
                  </div>
                }
              >
                <KnowledgeGraphPage />
              </React.Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/lessons/:lessonId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LessonPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/skill-lab" element={<ProtectedRoute><AppLayout><SkillLabPage /></AppLayout></ProtectedRoute>} />
      <Route path="/skill-lab/exercises/:exerciseId" element={<ProtectedRoute><AppLayout><ExercisePage /></AppLayout></ProtectedRoute>} />
      <Route path="/community/patterns" element={<ProtectedRoute><AppLayout><PatternsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/community/patterns/:patternId" element={<ProtectedRoute><AppLayout><PatternDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />

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

      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />

      {/* Password recovery landing (Supabase reset email redirects here) */}
      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        }
      />

      {/* Legal & contact (public) */}
      <Route path="/privacy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
      <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />

      <Route
        path="/admin/coupons"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AdminCouponsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
