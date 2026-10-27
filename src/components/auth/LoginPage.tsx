import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  KeyRound, 
  AlertTriangle, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import type { Officer } from '@/types';

interface Props {
  onLoginSuccess: (officer: Officer, csrfToken: string) => void;
  availableOfficers?: Officer[];
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'CREDENTIALS' | 'MFA'>('CREDENTIALS');
  const [serviceNumber, setServiceNumber] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceNumber: serviceNumber.trim(),
          password,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      if (data.status === 'TOTP_REQUIRED') {
        setStep('MFA');
        return;
      }

      if (data.user && data.csrfToken) {
        onLoginSuccess(data.user, data.csrfToken);
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Connection to authentication server failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceNumber: serviceNumber.trim(),
          password,
          totpCode: totpCode.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      if (data.user && data.csrfToken) {
        onLoginSuccess(data.user, data.csrfToken);
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Connection to authentication server failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Crest Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/40 shadow-xl shadow-amber-500/5">
            <Shield className="h-9 w-9 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Kenya Police Service
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Rockport Police Station (RPSMS) • Secure Terminal
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Lock className="h-4 w-4 text-amber-500" />
              <span>Zero-Trust Server Authentication</span>
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {step === 'CREDENTIALS' ? 'Step 1 of 2' : 'Step 2: 2FA TOTP'}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs leading-relaxed animate-in fade-in duration-200">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {step === 'CREDENTIALS' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Officer Service Number or Station Email
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={serviceNumber}
                  onChange={(e) => setServiceNumber(e.target.value)}
                  placeholder="e.g. KPS-238914 or ocs.mwangi@rockportpolice.go.ke"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Master Terminal Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 py-2.5 text-xs font-bold text-slate-950 transition-colors uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/10"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Verify Credentials</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Two-Factor Authentication Code (TOTP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="6-digit authenticator code"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-center text-xl font-mono tracking-widest text-slate-100 placeholder-slate-700 focus:border-amber-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-1 text-center font-mono">
                  Enter code from station-approved hardware token or Authenticator app
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setTotpCode('');
                    setError(null);
                  }}
                  className="w-1/3 rounded-lg border border-slate-700 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 py-2.5 text-xs font-bold text-slate-950 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Authenticate Session</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Compliance Footer */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <div>Kenya Data Protection Act 2019 • Article 49 Rights Compliance</div>
          <div>Protected by HttpOnly SameSite=Strict Server-Side Session Tokens</div>
        </div>
      </div>
    </div>
  );
};
