import React from 'react';
import {
  Search,
  Lock,
  Clock,
  LogOut,
  Menu,
  Cloud,
} from 'lucide-react';
import type { Officer } from '../../types';

interface TopHeaderProps {
  activeOfficer: Officer;
  officers: Officer[];
  onSwitchOfficer: (officerId: string) => void;
  secondsRemaining: number;
  onResetTimer: () => void;
  onOpenCommandSearch: () => void;
  onLockTerminal: () => void;
  onOpenRlsModal: () => void;
  onOpenNeonModal?: () => void;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  activeModuleName: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeOfficer,
  officers,
  onSwitchOfficer,
  secondsRemaining,
  onResetTimer,
  onOpenCommandSearch,
  onLockTerminal,
  onOpenRlsModal,
  onOpenNeonModal,
  onLogout,
  onToggleSidebar,
  activeModuleName,
}) => {
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgentSession = secondsRemaining < 180;

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-900"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 truncate text-xs">
          <span className="font-mono text-zinc-500 uppercase tracking-wider text-[11px] hidden sm:inline">
            ROCKPORT //
          </span>
          <span className="font-medium text-zinc-100 truncate tracking-tight">
            {activeModuleName}
          </span>
        </div>
      </div>

      {/* Center: Command Palette & Sentinel Copilot Trigger */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={onOpenCommandSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px]">Command Palette & Search...</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
            <span>Ctrl</span>
            <span>+</span>
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Terminal Walk-Away Lock */}
        <button
          onClick={onLockTerminal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition"
          title="Walk-away Terminal Lock (Ctrl+L)"
        >
          <Lock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden lg:inline text-[11px] font-mono">Lock</span>
        </button>

        {/* Live Session Timer */}
        <button
          onClick={onResetTimer}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900/80 border text-xs font-mono transition ${
            isUrgentSession
              ? 'border-red-800/80 text-red-400 animate-pulse'
              : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Session inactivity countdown (Click to extend)"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[11px]">{formatCountdown(secondsRemaining)}</span>
        </button>

        {/* Active Officer Identity & Role Switcher */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-zinc-200 truncate max-w-[130px]">
              {activeOfficer.full_name}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-end gap-1">
              <span>{activeOfficer.service_number}</span>
              <span>•</span>
              <span className="text-zinc-400">{activeOfficer.role_name}</span>
            </div>
          </div>

          <select
            value={activeOfficer.id}
            onChange={(e) => onSwitchOfficer(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
            title="Switch logged-in officer profile (To verify RLS & permissions)"
          >
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.role_name}: {o.full_name.split(' ')[0]} ({o.service_number})
              </option>
            ))}
          </select>
        </div>

        {/* Neon Cloud Services Inspector */}
        {onOpenNeonModal && (
          <button
            onClick={onOpenNeonModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:bg-zinc-800 transition"
            title="Inspect Neon Serverless Cloud Infrastructure (Postgres, Auth, Functions, Storage, Realtime)"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Neon Cloud</span>
          </button>
        )}

        {/* RLS Telemetry Button */}
        <button
          onClick={onOpenRlsModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:bg-zinc-800 transition"
          title="Inspect PostgreSQL Row-Level Security Status"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="hidden xl:inline">RLS Active</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-zinc-900 border border-zinc-800 transition"
          title="Terminate Terminal Session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
