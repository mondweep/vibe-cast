import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Layout.css';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'as', label: 'অস' },
  { code: 'hi', label: 'हि' },
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: '📊' },
    { to: '/property', label: t('nav.propertyRegistration'), icon: '🏠' },
    { to: '/auditing', label: t('nav.costAuditing'), icon: '📋' },
  ];

  const currentTitle = navItems.find(
    (item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  )?.label ?? t('header.title');

  const switchLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="layout">
      <header className="header" role="banner">
        <div className="header__inner">
          <div className="header__brand">
            <button
              className="header__menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              aria-label={t('header.toggleNav')}
            >
              <span className="header__menu-icon" aria-hidden="true">
                {menuOpen ? '✕' : '☰'}
              </span>
            </button>
            <div className="header__title-group">
              <h1 className="header__title">{t('header.title')}</h1>
              <span className="header__subtitle">{currentTitle}</span>
            </div>
          </div>
          <div className="header__meta">
            <span className="header__status" aria-label={`System status: ${t('header.online')}`}>
              <span className="header__status-dot" aria-hidden="true" /> {t('header.online')}
            </span>
            <div className="header__lang-switcher" role="group" aria-label="Language">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`header__lang ${i18n.language === lang.code ? 'header__lang--active' : ''}`}
                  onClick={() => switchLanguage(lang.code)}
                  aria-pressed={i18n.language === lang.code}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav
        id="main-nav"
        className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <ul className="sidebar__list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="sidebar__icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar__footer">
          <p>{t('footer.govOfAssam')}</p>
          <p className="sidebar__version">{t('footer.pwaDemo')}</p>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main" role="main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
