import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './shared/components/Layout'
import { ProtectedRoute } from './contexts/auth/components/ProtectedRoute'
import { SignIn } from './contexts/auth/components/SignIn'
import { SignUp } from './contexts/auth/components/SignUp'
import { PlayPage } from './pages/PlayPage'
import { RevisePage } from './pages/RevisePage'
import { ProgressPage } from './pages/ProgressPage'

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
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
      <Route path="*" element={<Navigate to="/play" replace />} />
    </Routes>
  )
}
