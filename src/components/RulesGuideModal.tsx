import React from 'react';
import { X, Shield, Swords, MapPin, Zap, AlertTriangle, Radio, Target } from 'lucide-react';

interface RulesGuideModalProps {
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none font-mono">
      <div className="w-full max-w-2xl bg-[#111827] border-2 border-slate-600 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e293b] border-b-2 border-slate-700 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px' }}>
              Field Operations Manual
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed">
          {/* Section 1: War Theater */}
          <div className="bg-[#0b0f19] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold uppercase text-[11px]">
              <MapPin className="w-4 h-4" />
              <span>1. Theater of Operations & Grid</span>
            </div>
            <p>
              • Fully procedural continent customizable via the <strong className="text-amber-400">New Game Menu</strong>: adjust map size (from 20×20 up to 100×100), select 1 to 3 AI computer opponents, and configure between 10 to 100 continental cities.
            </p>
            <p>
              • <strong className="text-white">Capitals & Cities:</strong> 1 Human Commander (Blue Guard) + 1 to 3 AI Rivals (Red Legion, Green Fleet, Gold Dominion). The remaining cities are neutral grey settlements waiting to be liberated.
            </p>
            <p>
              • <strong className="text-white">Fog of War:</strong> Tactical 1-tile perimeter vision, or toggle Fog OFF in New Game setup (selectable on the New Game screen only; when OFF, the entire continent is revealed to all players and AI commanders navigate directly towards all cities).
            </p>
            <p>
              • <strong className="text-cyan-400">Impassable Water:</strong> Deep water bodies are completely impassable. Tanks cannot traverse or conquer water, cities never spawn on water, and water does not connect tiles for supply lines or inverting.
            </p>
          </div>

          {/* Section 2: Tank Production & Deployment */}
          <div className="bg-[#0b0f19] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px]">
              <Zap className="w-4 h-4" />
              <span>2. Production, Deployment & Fast Controls</span>
            </div>
            <p>
              • Each player starts with <strong className="text-white">5 tanks placed on surrounding land</strong> (tanks never spawn on cities).
            </p>
            <p>
              • <strong className="text-white">No Tanks in Cities:</strong> You cannot place a tank on a city. If you attack a city with a tank and win, the city becomes your color and provides <strong className="text-emerald-400">+2 reinforcements/day</strong>, but the attacking tank stays outside.
            </p>
            <p>
              • <strong className="text-white">Mouse Controls:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li><strong className="text-amber-400">Right-Click Drag:</strong> Move and pan the tactical map.</li>
              <li><strong className="text-sky-400">Right-Click (Friendly Tank):</strong> Pick up a stationed tank from the ground into your reserve inventory.</li>
              <li><strong className="text-amber-300">Auto Pickup All Button:</strong> Located to the left of Deploy/End Day boxes; instantly recalls all deployed friendly tanks from across the continent into reserves in one click.</li>
              <li><strong className="text-emerald-400">Left-Click (Owned Land):</strong> Deploy a reserve tank onto your territory.</li>
              <li><strong className="text-red-400">Left-Click (Enemy/Neutral):</strong> Instant 1-click assault! (Direct attack, no confirmation prompt needed).</li>
              <li><strong className="text-white">Unlimited Tank Reuse:</strong> You can keep picking up and reusing tanks as much as you want across the frontlines, as long as they are not destroyed!</li>
            </ul>
          </div>

          {/* Section 3: Exact Combat Mathematics */}
          <div className="bg-[#0b0f19] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-[11px]">
              <Swords className="w-4 h-4" />
              <span>3. Combat Odds & Engagement Formulas</span>
            </div>
            <p>Assault odds are strictly calculated based on the target type and defending perimeter (8 surrounding tiles):</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              <div className="bg-[#182234] p-2 border border-slate-700/60">
                <span className="font-bold text-sky-400 block mb-1">Open Territory</span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• Base: <strong className="text-white">90%</strong></li>
                  <li>• 1 adj tank: 75%</li>
                  <li>• 2 adj tanks: 60%</li>
                  <li>• 3+ adj tanks: 45%</li>
                  <li>• Adj city: -10%</li>
                </ul>
              </div>

              <div className="bg-[#182234] p-2 border border-slate-700/60">
                <span className="font-bold text-amber-400 block mb-1">Direct City</span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• Base: <strong className="text-white">75%</strong></li>
                  <li>• 1 adj tank: 60%</li>
                  <li>• 2 adj tanks: 45%</li>
                  <li>• 3+ adj tanks: 30%</li>
                  <li>• Adj city: -10%</li>
                </ul>
              </div>

              <div className="bg-[#182234] p-2 border border-slate-700/60">
                <span className="font-bold text-red-400 block mb-1">Direct Tank</span>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• Base: <strong className="text-white">80%</strong></li>
                  <li>• 1 adj tank: 65%</li>
                  <li>• 2 adj tanks: 50%</li>
                  <li>• 3+ adj tanks: 35%</li>
                  <li>• Adj city: -10%</li>
                </ul>
              </div>
            </div>

            <p className="pt-1 text-emerald-400">
              ★ <strong className="text-white">Retry Escalation:</strong> If an assault fails, your odds on subsequent attacks against that sector multiply by <strong className="text-white">×1.05</strong> each time until captured!
            </p>
          </div>

          {/* Section 4: Supply Lines & Inverted Death State */}
          <div className="bg-[#0b0f19] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold uppercase text-[11px]">
              <AlertTriangle className="w-4 h-4" />
              <span>4. Supply Lines & Inverted Death State</span>
            </div>
            <p>
              • Cities keep the land controlled. All territory and tanks must connect back to a city of their own color (including neutral grey).
            </p>
            <p>
              • If territory or tanks are disconnected from their cities, they <strong className="text-amber-300">turn inverted in color</strong> after a player ends their turn (not during).
            </p>
            <p>
              • <strong className="text-emerald-400">100% Conquest Odds:</strong> Inverted land or tanks have guaranteed 100% success to conquer if assaulted directly!
            </p>
            <p>
              • <strong className="text-white">Turn-Start Auto-Takeover:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>
                <strong className="text-white">Adjacent Inverted Land:</strong> Auto taken over by a player at the beginning of their turn.
              </li>
              <li>
                <strong className="text-white">Adjacent Inverted Tanks:</strong> The tank is destroyed and turns into vacant land; on the following turn, that land is auto taken over!
              </li>
            </ul>
          </div>

          {/* Section 5: AI Commanders & Combat Playstyles */}
          <div className="bg-[#0b0f19] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold uppercase text-[11px]">
              <Target className="w-4 h-4" />
              <span>5. AI Commander Intelligence & Playstyles</span>
            </div>
            <p>
              • <strong className="text-white">Active Exploration:</strong> When Fog of War is active, computer commanders search for cities by actively expanding into the unknown to uncover as much dark territory as possible per attack.
            </p>
            <p>
              • <strong className="text-white">Supply Line Severing:</strong> In battles against rival players, commanders recognize the strategic danger and seek to cut opponent supply lines, isolating enemy tanks and inverting their sectors.
            </p>
            <p>
              • <strong className="text-white">Individually Configurable Playstyles:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li><strong className="text-red-400">Berserk:</strong> Aggressive explorer, commits 100% of tanks to assault, heavily targets player characters.</li>
              <li><strong className="text-emerald-400">Balanced:</strong> Keeps ~30% in reserve defending cities, focuses ~80% of offensive actions on player threats.</li>
              <li><strong className="text-amber-400">Defensive:</strong> Keeps ~60% in reserve around cities, splits attacks 50/50 between players and safe expansion.</li>
            </ul>
            <p className="text-amber-300 italic pt-1">
              ★ <strong className="text-white">Desperation Override:</strong> If any commander begins losing territory or cities, they release 100% of their reserves and use pure tactical probability math to turn the tide.
            </p>
          </div>

          {/* Section 6: Elimination & Victory */}
          <div className="bg-[#0b0f19] border border-slate-800 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-[11px]">
              <Shield className="w-4 h-4" />
              <span>6. Elimination & Campaign Victory</span>
            </div>
            <p>
              • <strong className="text-white">Once all cities are lost, a player is gone.</strong> All remaining isolated land falls.
            </p>
            <p>
              • Eliminate all 3 rival factions to secure supreme continental victory!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0b0f19] border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 active:scale-95 transition-all"
          >
            Understood, Commander
          </button>
        </div>
      </div>
    </div>
  );
};
