import { useState } from 'react';
import { KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  isSetupComplete: boolean;
  onCompleteSetup: (token: string, ocsEmail: string) => boolean;
}

export const FirstRunSetup: React.FC<Props> = ({ isSetupComplete, onCompleteSetup }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [ocsEmail, setOcsEmail] = useState('ocs.mwangi@rockportpolice.go.ke');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valid = onCompleteSetup(tokenInput.trim(), ocsEmail.trim());
    if (valid) {
      setSuccess(true);
    } else {
      setError('Invalid or expired one-time setup token. Check station configuration seed.');
    }
  };

  if (isSetupComplete) {
    return (
      <div className="max-w-2xl mx-auto rounded-lg border border-slate-800 bg-slate-900 p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
          FIRST-RUN BOOTSTRAP PERMANENTLY DISABLED
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          The initial station setup token for <strong>Rockport Police Station (RPS-001)</strong> has already been redeemed.
          The first-run setup route is cryptographically disabled in the database to prevent replay or hostile takeover.
        </p>
        <div className="rounded bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 border border-slate-800 max-w-sm mx-auto">
          STATUS: STATION_BOOTSTRAPPED_LOCKED
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto rounded-lg border border-amber-500/30 bg-slate-900 p-6 shadow-xl space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
            First-Run OCS Super Admin Bootstrap
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Redeem the hardware/offline one-time setup token to activate the first Station Commander (OCS) account.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="rounded border border-emerald-500/30 bg-emerald-950/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>OCS Bootstrap Completed & Token Consumed</span>
          </div>
          <p className="text-xs text-slate-300">
            Initial super admin account for Senior Supt. Joseph Mwangi has been activated. The setup token is permanently destroyed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              One-Time Station Setup Secret Token <span className="text-amber-500">*</span>
            </label>
            <input
              type="password"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter ROCKPORT-OCS-INITIAL-SETUP-SECRET-..."
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Default genesis token: <code className="text-amber-400">ROCKPORT-OCS-INITIAL-SETUP-SECRET-2026</code>
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              OCS Station Commander Email <span className="text-amber-500">*</span>
            </label>
            <input
              type="email"
              required
              value={ocsEmail}
              onChange={(e) => setOcsEmail(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded bg-amber-500 hover:bg-amber-600 py-2.5 text-xs font-bold text-slate-950 transition-colors uppercase tracking-wider"
            >
              Redeem Token & Lock Route Permanently
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
