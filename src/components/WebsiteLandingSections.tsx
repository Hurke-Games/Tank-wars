import React from 'react';
import {
  Shield,
  Swords,
  MapPin,
  Waves,
  Zap,
  Map,
  Download,
  Upload,
  BookOpen,
  Github,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Target,
  Crown
} from 'lucide-react';

interface WebsiteLandingSectionsProps {
  onOpenWorkshop: () => void;
  onOpenRules: () => void;
  onOpenNewGame: () => void;
}

export const WebsiteLandingSections: React.FC<WebsiteLandingSectionsProps> = ({
  onOpenWorkshop,
  onOpenRules,
  onOpenNewGame,
}) => {
  return (
    <div className="w-full bg-[#070a12] text-slate-300 font-mono text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        {/* Section 1: Hero Banner & Quick Deployment Callouts */}
        <section className="bg-linear-to-br from-[#0f172a] via-[#0b0f19] to-slate-900 border-2 border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              <span>★ Official Release · hurke-games.github.io/Tank-wars</span>
            </div>

            <h2
              className="text-xl sm:text-2xl font-extrabold uppercase text-white tracking-wide"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '15px', lineHeight: '1.6' }}
            >
              Advance Grid: Tank Wars
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              A 32-bit GBA tactical turn-based military strategy game. Command armored divisions across
              procedural continents, conquer continental cities, sever enemy supply lines to induce inverted
              death states, and design custom frontlines in the integrated Scenario Builder.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={onOpenNewGame}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider border border-emerald-400 active:scale-95 shadow-lg shadow-emerald-950/60 transition-all flex items-center gap-1.5"
              >
                <Sliders className="w-4 h-4" />
                <span>Start New Mission</span>
              </button>

              <button
                onClick={onOpenWorkshop}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider border border-amber-400 active:scale-95 shadow-lg shadow-amber-950/60 transition-all flex items-center gap-1.5"
              >
                <Map className="w-4 h-4" />
                <span>Scenario Builder & Workshop</span>
              </button>

              <button
                onClick={onOpenRules}
                className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-600 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Field Manual</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Key Tactical Features Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h3
              className="text-base sm:text-lg font-bold uppercase text-amber-400 tracking-wider"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px' }}
            >
              Tactical Warfare Systems
            </h3>
            <p className="text-slate-400 text-xs">
              Engineered with deep turn-based mechanics inspired by classic handheld tactical strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 space-y-3 hover:border-slate-600 transition-colors">
              <div className="w-8 h-8 bg-sky-950 border border-sky-400 flex items-center justify-center text-sky-300">
                <MapPin className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Procedural Continents</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Scale the battlefield from compact 20×20 skirmishes up to massive 100×100 continental campaigns
                (up to 10,000 sectors). Configure 10 to 100 cities with organic mountain ranges and plains.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 space-y-3 hover:border-slate-600 transition-colors">
              <div className="w-8 h-8 bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <Waves className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Impassable Water Barriers</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deep water bodies are impassable natural barriers. Tanks cannot traverse water, cities cannot spawn
                on water, and supply lines cannot bridge over water, forcing strategic bridgehead chokepoint battles.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 space-y-3 hover:border-slate-600 transition-colors">
              <div className="w-8 h-8 bg-red-950 border border-red-400 flex items-center justify-center text-red-300">
                <Target className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Adaptive AI Playstyles</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pick individual playstyles for each computer commander: <strong className="text-red-400">Berserk</strong> (0% reserve, aggressive exploration), <strong className="text-emerald-400">Balanced</strong> (30% reserve, 80% focus on players), or <strong className="text-amber-400">Defensive</strong> (60% reserve). All activate Desperation Overrides when losing territory.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 space-y-3 hover:border-slate-600 transition-colors">
              <div className="w-8 h-8 bg-purple-950 border border-purple-400 flex items-center justify-center text-purple-300">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Supply Lines & Inverted States</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Severing an enemy territory's link back to their cities cuts off their supply lines. Disconnected
                sectors turn inverted at turn end, becoming 100% conquerable or automatically captured on the next dawn.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 space-y-3 hover:border-slate-600 transition-colors">
              <div className="w-8 h-8 bg-amber-950 border border-amber-400 flex items-center justify-center text-amber-300">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Unlimited Tank Redeployment</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tanks are reusable indefinitely across the frontlines unless destroyed. Right-click any friendly
                tank to pick it up into your reserve inventory, or use the single-click <strong className="text-amber-300">Auto Pickup All</strong> button.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#0f172a] border border-slate-800 p-5 space-y-3 hover:border-slate-600 transition-colors">
              <div className="w-8 h-8 bg-emerald-950 border border-emerald-400 flex items-center justify-center text-emerald-300">
                <Map className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Scenario Builder & Sharing</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Full visual editor to build custom maps with water barriers, forests, cities, and starting tank forces.
                Export to <strong className="text-white">.tankwar.json</strong>, import shared files, and manage up to 10 stored scenarios locally.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Scenario Workshop Showcase */}
        <section className="bg-[#0b0f19] border-2 border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-xs">
                <Map className="w-4 h-4" />
                <span>Custom Mission Architect</span>
              </div>
              <h3
                className="text-sm sm:text-base font-bold uppercase text-white mt-1"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '11px' }}
              >
                Scenario Workshop & Community Maps
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenWorkshop}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider border border-amber-400 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Launch Builder</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#111827] p-4 border border-slate-800 space-y-2">
              <span className="font-bold text-sky-400 block">1. Design & Paint</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Choose custom dimensions (15×15 to 60×60+). Paint impassable water barriers, river networks, forests,
                cities, and stationed tanks with 1×1, 2×2, 3×3 brushes or the flood fill bucket.
              </p>
            </div>

            <div className="bg-[#111827] p-4 border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 block">2. Save, Import & Export</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Store up to 10 scenarios in your local browser slots. Download your maps as portable <strong className="text-white">.tankwar.json</strong> files
                to back them up or send them to friends to import and play.
              </p>
            </div>

            <div className="bg-[#111827] p-4 border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400 block">3. Instant Combat Deployment</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Every saved scenario can be launched directly into the game engine with full combat mathematics,
                AI commander strategies, fog of war, and tactical supply lines intact.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Faction Dossiers */}
        <section className="space-y-4">
          <h3
            className="text-base font-bold uppercase text-slate-200 tracking-wider"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '11px' }}
          >
            Continental Factions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Blue Guard */}
            <div className="bg-[#0f172a] border-l-4 border-blue-500 border-t border-r border-b border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 text-xs uppercase">Blue Guard</span>
                <span className="text-[9px] text-blue-300 bg-blue-950/60 px-1.5 py-0.5 border border-blue-800">
                  PLAYER 1 (HUMAN)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                1st Armored Division under direct player command. Specializes in flexible redeployment, combined arms assaults, and surgical supply cutoffs.
              </p>
            </div>

            {/* Red Legion */}
            <div className="bg-[#0f172a] border-l-4 border-red-500 border-t border-r border-b border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-400 text-xs uppercase">Red Legion</span>
                <span className="text-[9px] text-red-300 bg-red-950/60 px-1.5 py-0.5 border border-red-800">
                  RIVAL AI 2
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Crimson Corp armored vanguard. Default Berserk doctrine: commits 100% of tanks to assault and relentlessly expands the fog perimeter.
              </p>
            </div>

            {/* Green Fleet */}
            <div className="bg-[#0f172a] border-l-4 border-emerald-500 border-t border-r border-b border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs uppercase">Green Fleet</span>
                <span className="text-[9px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-800">
                  RIVAL AI 3
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Emerald Division mechanized troops. Default Balanced doctrine: retains ~30% reserve around cities and focuses ~80% of attacks on player threats.
              </p>
            </div>

            {/* Gold Dominion */}
            <div className="bg-[#0f172a] border-l-4 border-amber-500 border-t border-r border-b border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs uppercase">Gold Dominion</span>
                <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 border border-amber-800">
                  RIVAL AI 4
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Solar Strike continental fortress legion. Default Defensive doctrine: fortifies ~60% reserves around cities and divides offensive actions evenly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: GitHub Pages & Technical Deployment */}
        <section className="bg-[#0b0f19] border border-slate-800 p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-bold uppercase text-xs">
            <Github className="w-4 h-4 text-white" />
            <span>GitHub Pages Deployment & Open Source Architecture</span>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            This application is optimized for zero-configuration deployment to GitHub Pages at{' '}
            <a
              href="https://hurke-games.github.io/Tank-wars/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 underline font-semibold hover:text-amber-300"
            >
              https://hurke-games.github.io/Tank-wars/
            </a>
            . Built with Vite and relative base asset resolution (<code className="bg-[#1e293b] px-1 py-0.5 text-sky-300">base: './'</code>)
            so scripts and stylesheets never load as blank pages regardless of repository subpath nesting. Includes automated GitHub Actions workflow for push-to-deploy.
          </p>

          <div className="flex items-center gap-4 pt-2 text-[11px]">
            <a
              href="https://github.com/hurke-games/Tank-wars"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold"
            >
              <span>View Repository on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">React 19 + TypeScript + Vite + Tailwind CSS</span>
          </div>
        </section>
      </div>

      {/* Website Footer */}
      <footer className="bg-[#050810] border-t border-slate-800/80 py-6 px-4 text-center text-slate-500 text-[11px] space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rotate-45" />
          <span className="font-bold text-slate-400 tracking-wider uppercase">
            HURKE GAMES · TANK WARS: ADVANCE GRID
          </span>
          <div className="w-2 h-2 bg-amber-500 rotate-45" />
        </div>
        <p>© {new Date().getFullYear()} Hurke Games. All rights reserved. Built for desktop and mobile tactical commanders.</p>
      </footer>
    </div>
  );
};
