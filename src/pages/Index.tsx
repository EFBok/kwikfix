import { useState, useEffect } from 'react';
import { getCompany, getProSettings, initSampleData } from '@/store/kwikfix-store';
import SetupScreen from './SetupScreen';
import MainJobScreen from './MainJobScreen';
import MyJobsScreen from './MyJobsScreen';
import SubscriptionScreen from './SubscriptionScreen';
import BottomNav from '@/components/BottomNav';

export default function Index() {
  const [hasCompany, setHasCompany] = useState(!!getCompany());
  const [screen, setScreen] = useState('job');
  const [theme, setTheme] = useState(getProSettings().theme);

  useEffect(() => {
    initSampleData();
  }, []);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [theme]);

  if (!hasCompany) {
    return <SetupScreen onComplete={() => setHasCompany(true)} />;
  }

  return (
    <div className="max-w-lg mx-auto">
      {screen === 'job' && <MainJobScreen />}
      {screen === 'jobs' && <MyJobsScreen />}
      {screen === 'sub' && <SubscriptionScreen onThemeChange={setTheme} />}
      <BottomNav active={screen} onNavigate={setScreen} />
    </div>
  );
}
