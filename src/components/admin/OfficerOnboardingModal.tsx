import { useState } from 'react';
import { ShieldCheck, UserPlus, Copy, Check, AlertCircle, X } from 'lucide-react';
import type { RoleName } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOnboard: (officerData: any) => void;
  stationId: string;
}

export const OfficerOnboardingModal: React.FC<Props> = ({ isOpen, onClose, onOnboard, stationId }) => {
  const [fullName, setFullName] = useState('');
  const [serviceNumber, setServiceNumber] = useState('KPS-');
  const [nationalId, setNationalId] = useState('');
  const [rank, setRank] = useState('Police Constable');
  const [role, setRole] = useState<RoleName>('DUTY_OFFICER_OB_CLERK');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+254');
  const [generatedInvite, setGeneratedInvite] = useState<{ token: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serviceNumber.match(/^KPS-\d{5,7}$/)) {
      setError('Service number must follow format KPS-XXXXXX (5 to 7 digits)');
      return;
    }
    if (fullName.trim().length < 3) {
      setError('Full name must be at least 3 characters');
      return;
    }
    if (!email.includes('@')) {
      setError('Valid official email address is required');
      return;
    }

    const token = crypto.randomUUID();
    const url = `${window.location.origin}/accept-invite?token=${token}`;

    const newOfficer = {
      id: crypto.randomUUID(),
      station_id: stationId,
      service_number: serviceNumber.toUpperCase(),
      full_name: fullName.trim(),
      role_id: crypto.randomUUID(),
      role_name: role,
      rank,
      email: email.trim().toLowerCase(),
      phone_number: phoneNumber.trim(),
      status: 'PENDING_INVITE',
      is_active: false,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    };

    onOnboard(newOfficer);
    setGeneratedInvite({ token, url });
  };

  const handleCopy = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold tracking-wide text-slate-100">
              OCS OFFICER ONBOARDING (INVITE ONLY)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {generatedInvite ? (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-500/30 bg-emerald-950/40 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-300">Officer Onboarded & Invite Generated</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      A single-use invite token (valid for 48 hours) was created and an audit log event was chained.
                      The officer must establish mandatory TOTP MFA during initial password setup.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Secure Invite URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.url}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-emerald-400 select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setGeneratedInvite(null);
                    onClose();
                  }}
                  className="rounded bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Service Number <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceNumber}
                    onChange={(e) => setServiceNumber(e.target.value)}
                    placeholder="KPS-248910"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Format: KPS-XXXXXX</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    National ID Number <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="28475920"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Encrypted at rest + blind-index</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Full Legal Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Samuel Mutua Kilonzo"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Station Rank <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="Police Constable">Police Constable (PC)</option>
                    <option value="Corporal">Corporal (Cpl)</option>
                    <option value="Sergeant">Sergeant (Sgt)</option>
                    <option value="Senior Sergeant">Senior Sergeant (S/Sgt)</option>
                    <option value="Inspector">Inspector of Police (IP)</option>
                    <option value="Chief Inspector">Chief Inspector (CI)</option>
                    <option value="Superintendent">Superintendent (SP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    System Role (RBAC) <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RoleName)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="DUTY_OFFICER_OB_CLERK">Duty Officer / OB Clerk</option>
                    <option value="INVESTIGATING_OFFICER">Investigating Officer (IO)</option>
                    <option value="CELL_SERGEANT">Cell Sergeant</option>
                    <option value="RECORDS_CLERK">Records Clerk</option>
                    <option value="DEPUTY_OCS">Deputy OCS</option>
                    <option value="AUDITOR">Auditor (Internal Oversight)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Official Email <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="s.mutua@rockportpolice.go.ke"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Phone Number <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-slate-700 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors"
                >
                  Generate Invite & Chain Log
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
