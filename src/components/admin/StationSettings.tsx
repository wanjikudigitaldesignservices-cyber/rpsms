import { useState } from 'react';
import { Building2, Save, Clock, Lock, Check } from 'lucide-react';
import type { StationSettingsData } from '@/types';

interface Props {
  settings: StationSettingsData;
  onSave: (updated: StationSettingsData, justification: string) => void;
  activeRole: string;
}

export const StationSettings: React.FC<Props> = ({ settings, onSave, activeRole }) => {
  const [formData, setFormData] = useState<StationSettingsData>({ ...settings });
  const [justification, setJustification] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeRole !== 'OCS') {
      setError('Station Command policy: Only OCS can modify official station settings.');
      return;
    }

    if (justification.trim().length < 8) {
      setError('A written administrative justification is mandatory to modify station settings.');
      return;
    }

    onSave(formData, justification.trim());
    setIsSaved(true);
    setJustification('');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Station Identity & Statutory Compliance Settings</h3>
            <p className="text-xs text-slate-400">
              Station Code: <span className="font-mono text-amber-400">{formData.code}</span> | 
              Jurisdiction: <span className="text-slate-200">{formData.county} County, {formData.sub_county}</span>
            </p>
          </div>
        </div>
      </div>

      {isSaved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Station settings successfully updated and cryptographically recorded in the audit log.</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Station Details */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Station Headquarters Profile
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Station Official Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Police Station Code</label>
              <input
                type="text"
                disabled
                value={formData.code}
                className="w-full rounded border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-xs font-mono text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">County & Sub-County</label>
              <input
                type="text"
                value={`${formData.county} / ${formData.sub_county}`}
                disabled
                className="w-full rounded border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Official Inquiry Desk Hotline</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Custody & Statutory Clock Rules */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Article 49 Statutory Custody Clock Configuration
          </h4>
          <p className="text-xs text-slate-400">
            Enforces the 24-hour statutory limit for arrested persons in police custody without court arraignment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Maximum Custody Limit</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={12}
                  max={24}
                  value={formData.custody_clock_limit_hours}
                  onChange={(e) => setFormData({ ...formData, custody_clock_limit_hours: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400 font-mono">Hours</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Threshold 1 (Cell Sgt Alert)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={6}
                  max={18}
                  value={formData.custody_warning_threshold_1}
                  onChange={(e) => setFormData({ ...formData, custody_warning_threshold_1: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400 font-mono">Hours</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Threshold 2 (OCS Urgent Alert)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={23}
                  value={formData.custody_warning_threshold_2}
                  onChange={(e) => setFormData({ ...formData, custody_warning_threshold_2: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400 font-mono">Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Zero-Trust Security Policies */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security & Authentication Policies
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Session Inactivity Timeout</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={formData.session_timeout_minutes}
                  onChange={(e) => setFormData({ ...formData, session_timeout_minutes: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400 font-mono">Minutes</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Locks station terminal upon idle time</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Mandatory TOTP MFA Enforcement</label>
              <div className="flex items-center h-8">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.require_mandatory_mfa}
                    onChange={(e) => setFormData({ ...formData, require_mandatory_mfa: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {formData.require_mandatory_mfa ? 'Enforced for All Officers' : 'Optional (Not Recommended)'}
                  </span>
                </label>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Blocks station login without valid 6-digit authenticator code</p>
            </div>
          </div>
        </div>

        {/* Section 4: Written Administrative Justification */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-3">
          <label className="text-xs font-bold text-slate-200 block">
            Administrative Justification <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Official Gazette or Station Order reference for settings adjustment..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-hidden"
          />
          <p className="text-[10px] text-slate-500">
            Modifications to station configuration require written justification and trigger an immutable audit log entry.
          </p>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={activeRole !== 'OCS'}
              className="flex items-center gap-2 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 text-xs font-semibold text-slate-950 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Configuration & Chain Event
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
