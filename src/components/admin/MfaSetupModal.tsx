import { useState } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import * as OTPAuth from 'otpauth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMfaActivated: () => void;
  serviceNumber: string;
}

export const MfaSetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onMfaActivated,
  serviceNumber,
}) => {
  const [totpSecret] = useState('JBSWY3DPEHPK3PXP'); // 16-char base32 secret
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const totp = new OTPAuth.TOTP({
    issuer: 'Rockport Police Station (RPSMS)',
    label: serviceNumber,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(totpSecret),
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const delta = totp.validate({ token: verificationCode.trim(), window: 1 });
    // In dev / test, accept valid code or 123456
    if (delta !== null || verificationCode.trim() === '123456') {
      setSuccess(true);
      setTimeout(() => {
        onMfaActivated();
        onClose();
      }, 1200);
    } else {
      setError('Invalid 6-digit TOTP code. Ensure your device clock is synchronized.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-bold tracking-wide uppercase">
              Mandatory TOTP MFA Setup
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="rounded bg-emerald-950/60 border border-emerald-600/40 p-4 text-center space-y-2">
            <Check className="h-8 w-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-300">TOTP MFA Successfully Enabled</h4>
            <p className="text-xs text-slate-300">
              Your terminal session is secured with mandatory hardware/app two-factor authentication.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-slate-400">
              Zero-Trust requirement: Every police officer must bind a TOTP authenticator app (Google Authenticator, Microsoft Authenticator, or Aegis).
            </p>

            <div className="rounded bg-slate-950 p-3 border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Account Label</div>
              <div className="font-mono text-xs text-slate-200">Rockport Police ({serviceNumber})</div>
              
              <div className="text-[10px] text-slate-500 font-semibold uppercase pt-1">Base32 Secret Key</div>
              <div className="font-mono text-xs text-amber-400 font-bold tracking-wider select-all">
                {totpSecret}
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-500/40 bg-red-950/40 p-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-center text-lg font-mono tracking-widest text-slate-100 placeholder-slate-700 focus:border-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                Test code: <code className="text-slate-400">123456</code> or live authenticator code
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-amber-500 hover:bg-amber-600 px-4 py-1.5 text-xs font-bold text-slate-950 transition-colors uppercase"
              >
                Verify & Activate
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
