import React from 'react';
import FieldView from './components/FieldView.jsx';
import WheelView from './components/WheelView.jsx';
import GlobeView from './components/GlobeView.jsx';
import CoherenceSpine from './components/CoherenceSpine.jsx';
import Scrubber from './components/Scrubber.jsx';
import HUD from './components/HUD.jsx';
import LayerPanel from './components/LayerPanel.jsx';
import HotspotsPanel from './components/HotspotsPanel.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import BetaDialog from './shared/shell/BetaDialog.jsx';
import { useStore } from './store.js';

export default function App() {
  const view = useStore(s => s.view);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#080810] text-[#e6e6f0]">
      <div className="relative flex-1 min-h-0">
        {view === 'field' && <FieldView />}
        {view === 'wheel' && <WheelView />}
        {view === 'globe' && <GlobeView />}
        <HUD />
        <ViewToggle />
        {view !== 'globe' && <LayerPanel />}
        <HotspotsPanel />
      </div>

      <div className="border-t border-white/5 bg-[#0a0a14]/80 backdrop-blur-sm">
        <CoherenceSpine />
        <div className="px-5 py-3 flex items-center justify-between border-t border-white/5">
          <Scrubber />
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#6d6d88]">
            1500 CE — 2080 CE · Geocentric Ecliptic
          </div>
        </div>
      </div>
      <BetaDialog />
    </div>
  );
}
