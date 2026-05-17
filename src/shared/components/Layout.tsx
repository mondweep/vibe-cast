import { Outlet, NavLink, Link } from 'react-router-dom';
import { Play, BookOpen, BarChart3, LogOut, Library, Github, Linkedin, Heart, Info, Inbox } from 'lucide-react';
import { useAuth } from '../../contexts/auth/hooks/useAuth';
import { useCurator } from '../../contexts/auth/hooks/useCurator';
import { ConsentBanner } from './ConsentBanner';

export function Layout() {
  const { signOut, user } = useAuth();
  const { isCurator } = useCurator();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link to="/library" className="text-xl font-bold text-amber-400 tracking-wide">
          SanskritSync
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-400">{user.email}</span>
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              to="/signin"
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <ConsentBanner />

      <nav className="border-t border-gray-800 px-6 py-2">
        <div className="flex justify-center gap-10">
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Library size={20} />
            Library
          </NavLink>
          <NavLink
            to="/play"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Play size={20} />
            Play
          </NavLink>
          <NavLink
            to="/revise"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <BookOpen size={20} />
            Revise
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <BarChart3 size={20} />
            Progress
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Info size={20} />
            About
          </NavLink>
          {/* Curator-only Queue tab. Hidden from regular users; the route
              itself is also gated by ProtectedRoute + the page's own check. */}
          {isCurator && (
            <NavLink
              to="/queue"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <Inbox size={20} />
              Queue
            </NavLink>
          )}
        </div>
      </nav>

      <footer className="border-t border-gray-900 bg-gray-950 px-6 py-3 text-center text-xs text-gray-500">
        <span>Built by </span>
        <a
          href="https://www.linkedin.com/in/mondweepchakravorty/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-amber-500/80 transition-colors hover:text-amber-400"
        >
          <Linkedin size={11} /> Mondweep Chakravorty
        </a>
        <span className="mx-2 text-gray-700">·</span>
        <a
          href="https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-amber-500/80 transition-colors hover:text-amber-400"
        >
          <Github size={11} /> Source &amp; contributions
        </a>
        <span className="mx-2 text-gray-700">·</span>
        <a
          href="https://paypal.me/mondweep"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-amber-500/80 transition-colors hover:text-amber-400"
        >
          <Heart size={11} /> Support this work
        </a>
        <span className="mx-2 text-gray-700">·</span>
        <Link to="/privacy" className="text-gray-500 transition-colors hover:text-gray-300">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
