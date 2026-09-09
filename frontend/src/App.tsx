import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLearnerStore } from './store/learner';
import Layout from './components/Layout';
import ModuleSelector from './components/ModuleSelector';
import Module from './components/Module';
import './styles/App.css';

function App() {
  const { t } = useTranslation(['common', 'modules']);
  const { session, setCurrentModule, startSession, loginUser } = useLearnerStore();

  useEffect(() => {
    // Initialize session once when a user logs in (startSession() itself
    // produces a new session object, so depending on `session` here would
    // re-trigger the effect on every run and loop forever).
    if (session) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.session_id, startSession]);

  if (!session) {
    return (
      <Layout>
        <div className="landing-page">
          <h1>{t('common:app_title')}</h1>
          <p>{t('common:app_subtitle')}</p>
          <button
            className="btn btn-primary"
            onClick={() => loginUser(`guest_${Date.now()}`, 'guest@example.com', 'Guest')}
          >
            {t('common:btn_login')}
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
          <ModuleSelector onSelectModule={setCurrentModule} />
        ) : (
          <Module moduleId={session.module_id} onNext={() => setCurrentModule(session.module_id + 1)} />
        )}
      </div>
    </Layout>
  );
}

export default App;
