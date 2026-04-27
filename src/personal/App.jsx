import React, { useEffect } from 'react';
import { usePersonal } from './store.js';
import BirthForm from './components/BirthForm.jsx';
import ModeNav from './components/ModeNav.jsx';
import NatalSummary from './components/NatalSummary.jsx';
import LifeVectorsGraph from './components/LifeVectorsGraph.jsx';
import NatalWheel from './components/NatalWheel.jsx';
import PersonalGlobe from './components/PersonalGlobe.jsx';
import ChartProfile from './components/ChartProfile.jsx';
import Synastry from './components/Synastry.jsx';
import InfoPopover from './components/InfoPopover.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import PrecisionBadge from './components/PrecisionBadge.jsx';
import KeyboardShortcuts from './components/KeyboardShortcuts.jsx';
import PredictiveMode from './components/PredictiveMode.jsx';
import MobileNotice from './components/MobileNotice.jsx';
import BetaDialog from '../shared/shell/BetaDialog.jsx';
import TestRunner from './test/Runner.jsx';

export default function App() {
  const hasEntered   = usePersonal(s => s.hasEntered);
  const mode         = usePersonal(s => s.mode);
  const natal        = usePersonal(s => s.natal);
  const swissStatus  = usePersonal(s => s.swissStatus);
  const info         = usePersonal(s => s.info);
  const closeInfo    = usePersonal(s => s.closeInfo);

  // Close info popover on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeInfo(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeInfo]);

  // Phase 7: #test hash activates the in-browser test mode overlay.
  // Cmd+Shift+T (handled in KeyboardShortcuts) sets the hash.
  const [testMode, setTestMode] = React.useState(() =>
    typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#test'
  );
  useEffect(() => {
    const onHash = () => setTestMode(window.location.hash.toLowerCase() === '#test');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const closeTest = () => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    setTestMode(false);
  };

  // Per Phase 1: while Swiss is loading we hold off on rendering a chart
  // computed from the Standish+Meeus fallback. Users already past the birth
  // form see a subtle "Loading ephemeris…" state; users who have not
  // entered just see the birth form as usual.
  if (hasEntered && !natal && (swissStatus === 'loading' || swissStatus === 'idle')) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#080810] text-[#e6e6f0]">
        <div className="text-sm tracking-wide text-[#d79b3a] animate-pulse">
          Loading ephemeris…
        </div>
      </div>
    );
  }

  if (!hasEntered || !natal) return <>
    <BirthForm /><InfoPopover /><KeyboardShortcuts /><MobileNotice /><BetaDialog />
    {testMode && <TestRunner onClose={closeTest} />}
  </>;

  return (
    <div className="w-screen h-screen flex flex-col bg-[#080810] text-[#e6e6f0]">
      <ModeNav />
      {/* NatalSummary only appears in Profile mode; elsewhere we surrender
          the vertical strip so the active view (wheel / graph / globe) has
          maximum real estate. Chart actions (Change, Download) are in ModeNav
          and always available. */}
      {mode === 'profile' && <NatalSummary />}
      <main className="flex-1 min-h-0 overflow-auto">
        {mode === 'profile'    && <ChartProfile />}
        {mode === 'vectors'    && <LifeVectorsGraph />}
        {mode === 'wheel'      && <NatalWheel />}
        {mode === 'predictive' && <PredictiveMode />}
        {mode === 'globe'      && <PersonalGlobe />}
        {mode === 'synastry'   && <Synastry />}
      </main>
      <InfoPopover />
      <SettingsDrawer />
      <PrecisionBadge />
      <KeyboardShortcuts />
      <MobileNotice />
      <BetaDialog />
      {testMode && <TestRunner onClose={closeTest} />}
    </div>
  );
}
