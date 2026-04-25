import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import ObituariesPage from './pages/ObituariesPage.jsx';
import LivePage from './pages/LivePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import ImprovePage from './pages/ImprovePage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4 text-center text-ink">
        <div className="card max-w-md p-6">
          <p className="font-sora text-lg font-semibold">Connecting DORMIA...</p>
          <p className="mt-2 text-sm text-text-secondary">
            If this takes too long, refresh once and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/lost-streaks" element={<ObituariesPage />} />
          <Route path="/improve" element={<ImprovePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/live" element={<LivePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
