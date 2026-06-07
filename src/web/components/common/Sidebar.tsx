import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, GraduationCap, Award, Users, User, ChevronLeft } from 'lucide-react';
import { ROUTES } from '@/config/constants';

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: BarChart3 },
    { label: 'Learning Paths', path: ROUTES.PATHS, icon: GraduationCap },
    { label: 'Enrollments', path: ROUTES.ENROLLMENT, icon: BookOpen },
    { label: 'Badges', path: ROUTES.BADGES, icon: Award },
    { label: 'Leaderboard', path: ROUTES.LEADERBOARD, icon: Users },
    { label: 'Profile', path: ROUTES.PROFILE, icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={`hidden md:block bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-screen">
        {/* Collapse Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              size={20}
              className={`transform transition-transform ${
                collapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? 'bg-primary-100 text-primary-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={collapsed ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {!collapsed && 'v1.0.0'}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
