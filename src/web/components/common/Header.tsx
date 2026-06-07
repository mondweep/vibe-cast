import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Menu, X, LogOut, User } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">
              Vibe-Cast
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              to="/enrollment"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Enrollments
            </Link>
            <Link
              to="/badges"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Badges
            </Link>
            <Link
              to="/leaderboard"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Leaderboard
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Profile"
                >
                  <User size={20} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  aria-label="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : null}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              to="/"
              className="block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
            >
              Dashboard
            </Link>
            <Link
              to="/enrollment"
              className="block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
            >
              Enrollments
            </Link>
            <Link
              to="/badges"
              className="block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
            >
              Badges
            </Link>
            <Link
              to="/leaderboard"
              className="block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
            >
              Leaderboard
            </Link>
            {user && (
              <>
                <Link
                  to="/profile"
                  className="block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
