import React, { useState } from 'react';
import { Lock, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isLocked) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Re-verify credentials against server unlock endpoint
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          password: password
        })
      });

      const data = await res.json();

      if (res.ok && data.status === 'UNLOCKED') {
        setPassword('');
        setError(null);
        onUnlock();
      } else {
        setError(data.error || 'Invalid officer credentials. Access attempt logged.');
      }
    } catch {
      setError('Terminal verification failed. Try again or logout.');
    } finally {
      setIsLoading(false);
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
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Enter Password to Resume
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Officer password"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-md text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-zinc-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="w-1/2 py-2 border border-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-900 transition-colors"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-1/2 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-md hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Unlock</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
