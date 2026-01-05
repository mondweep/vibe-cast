import { useState } from 'react';
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { Phrasebook } from './components/Phrasebook';
import { LiveTranslate } from './components/LiveTranslate';
import { RecentTranslations } from './components/RecentTranslations';
import { Footer } from './components/Footer';

function App() {
  const [activeTab, setActiveTab] = useState('vault');

  return (
    <div className="min-h-screen bg-axom-dark">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {activeTab === 'vault' && <Phrasebook />}
        {activeTab === 'translate' && (
          <div className="space-y-8">
            <LiveTranslate />
            <RecentTranslations />
          </div>
        )}
      </main>

      <Footer />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
