import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLearnerStore } from '../store/learner';
import '../styles/Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation('common');
  const { session, logoutUser } = useLearnerStore();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">{t('app_title')}</h1>
          <nav className="nav">
            <a href="/">{t('nav_home')}</a>
            <a href="/modules">{t('nav_modules')}</a>
            {session && <a href="/progress">{t('nav_progress')}</a>}
          </nav>
          <div className="header-actions">
            {session && (
              <button onClick={() => logoutUser()} className="btn btn-sm">
                {t('btn_logout')}
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 NavierStokes Learning Platform</p>
          <div className="footer-links">
            <a href="/privacy">{t('footer_privacy')}</a>
            <a href="/terms">{t('footer_terms')}</a>
            <a href="/accessibility">{t('footer_accessibility')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
