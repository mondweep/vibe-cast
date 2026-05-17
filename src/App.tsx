import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './shared/components/Layout'
import { ProtectedRoute } from './contexts/auth/components/ProtectedRoute'
import { SignIn } from './contexts/auth/components/SignIn'
import { SignUp } from './contexts/auth/components/SignUp'
import { PlayPage } from './pages/PlayPage'
import { RevisePage } from './pages/RevisePage'
import { ProgressPage } from './pages/ProgressPage'
import { LibraryPage } from './pages/LibraryPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { AboutPage } from './pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Public routes — accessible without signing in.
          /library, /play (read-only), and /privacy are open.
          /play hides curator UI + vocabulary tracking when the user is
          anonymous; signed-in users get the full experience. */}
      <Route element={<Layout />}>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>

      {/* Personal SRS pages still require sign-in. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/revise" element={<RevisePage />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  )
}
