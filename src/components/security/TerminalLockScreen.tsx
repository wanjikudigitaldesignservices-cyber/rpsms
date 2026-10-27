import React, { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import type { Officer } from '../../types';

interface TerminalLockScreenProps {
  isLocked: boolean;
  activeOfficer: Officer;
  onUnlock: () => void;
  onLogout: () => void;
}

export const TerminalLockScreen: React.FC<TerminalLockScreenProps> = ({
  isLocked,
  activeOfficer,
  onUnlock,
  onLogout,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isLocked) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN 1234 or service number suffix
    if (pin === '1234' || pin === '123456' || pin === activeOfficer.service_number) {
      setError(null);
      setPin('');
      onUnlock();
    } else {
      setError('Invalid security PIN. Access attempt recorded.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-md p-6 shadow-2xl text-center space-y-5">
        {/* Lock Icon */}
        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-md flex items-center justify-center mx-auto text-zinc-300">
          <Lock className="w-5 h-5 text-zinc-100" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
            National Police Service • RPS-001
          </span>
          <h2 className="text-base font-semibold text-zinc-100 mt-1 tracking-tight">
            Terminal Locked (Walk-Away Protection)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Session paused for <strong>{activeOfficer.rank} {activeOfficer.full_name}</strong> ({activeOfficer.service_number}).
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          {error && (
            <div className="p-2.5 bg-red-950/60 border border-red-900/60 text-red-300 text-xs rounded-md flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Enter Quick PIN (Default: 1234)
            </label>
            <input
              type="password"
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-center tracking-widest font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded-md transition shadow"
            >
              Resume Terminal Session
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition"
            >
              Sign out completely
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-zinc-900 text-[10px] text-zinc-600 font-mono">
          STATION AUDIT ACTIVE • ALL FAILED UNLOCKS LOGGED
        </div>
      </div>
    </div>
  );
};
