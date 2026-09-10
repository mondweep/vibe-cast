import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLearnerStore } from './store/learner';
import Layout from './components/Layout';
import ModuleSelector from './components/ModuleSelector';
import Module from './components/Module';
import './styles/App.css';

function App() {
  const { t } = useTranslation(['common', 'modules']);
  const { session, setCurrentModule, startSession, loginUser } = useLearnerStore();
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  useEffect(() => {
    // Initialize session once when a user logs in
    if (session) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.session_id, startSession]);

  const handleLogin = async () => {
    setIsLoginLoading(true);
    try {
      await loginUser(`guest_${Date.now()}`, 'guest@example.com', 'Guest');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleModuleSelect = async (moduleId: number) => {
    try {
      await setCurrentModule(moduleId);
    } catch (error) {
      console.error('Failed to select module:', error);
    }
  };

  const handleNextModule = async () => {
    if (session) {
      try {
        await setCurrentModule(session.module_id + 1);
      } catch (error) {
        console.error('Failed to advance to next module:', error);
      }
    }
  };

  if (!session) {
    return (
      <Layout>
        <div className="landing-page">
          <h1>{t('common:app_title')}</h1>
          <p>{t('common:app_subtitle')}</p>
          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={isLoginLoading}
          >
            {isLoginLoading ? t('common:msg_loading') : t('common:btn_login')}
          </button>
          <p className="text-muted">Sign in to start learning about Navier-Stokes equations</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="app-container">
        {session.module_id === -1 ? (
          <ModuleSelector onSelectModule={handleModuleSelect} />
        ) : (
          <Module moduleId={session.module_id} onNext={handleNextModule} />
        )}
      </div>
    </Layout>
  );
}

export default App;
