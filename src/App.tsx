import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './shared/components/Layout'
import { ProtectedRoute } from './contexts/auth/components/ProtectedRoute'
import { SignIn } from './contexts/auth/components/SignIn'
import { SignUp } from './contexts/auth/components/SignUp'
import { PlayPage } from './pages/PlayPage'
import { RevisePage } from './pages/RevisePage'
import { ProgressPage } from './pages/ProgressPage'
import { LibraryPage } from './pages/LibraryPage'

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* /library is PUBLIC — anonymous visitors can browse verified songs. */}
      <Route element={<Layout />}>
        <Route path="/library" element={<LibraryPage />} />
      </Route>

      {/* Everything else still requires sign-in. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/play" element={<PlayPage />} />
        <Route path="/revise" element={<RevisePage />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  )
}
