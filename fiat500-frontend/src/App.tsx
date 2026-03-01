import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import About from './pages/About';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-fiat-dark flex flex-col">
        {/* Header */}
        <header className="bg-fiat-navy border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              <h1 className="text-xl font-bold text-white">
                Fiat 500 <span className="text-fiat-accent">Tracker</span>
              </h1>
            </NavLink>
            <nav className="flex gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-fiat-accent text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/listings"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-fiat-accent text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                All Listings
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-fiat-accent text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                About
              </NavLink>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-fiat-navy border-t border-slate-700 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
            <span>
              Built by{' '}
              <a
                href="https://www.linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fiat-blue hover:text-blue-400 font-medium"
              >
                Mondweep Chakravorty
              </a>
            </span>
            <a
              href="https://github.com/mondweep/vibe-cast"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              github.com/mondweep/vibe-cast
            </a>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
