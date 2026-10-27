import { Shield, Check, X } from 'lucide-react';
import type { RoleName } from '@/types';

interface RoleRow {
  role: RoleName;
  title: string;
  description: string;
  onboardOfficers: boolean;
  createOb: boolean;
  custodyCells: boolean;
  auditViewer: boolean;
  fourEyesApprover: boolean;
  riskDashboard: boolean;
  caseAccess: 'ALL' | 'ASSIGNED' | 'READ_ONLY' | 'NONE';
}

const ROLES_DATA: RoleRow[] = [
  {
    role: 'OCS',
    title: 'Officer Commanding Station (Super Admin)',
    description: 'Full station authority. Onboards/suspends officers, assigns roles, approves sensitive operations, inspects station risk dashboard.',
    onboardOfficers: true,
    createOb: true,
    custodyCells: true,
    auditViewer: true,
    fourEyesApprover: true,
    riskDashboard: true,
    caseAccess: 'ALL',
  },
  {
    role: 'DEPUTY_OCS',
    title: 'Deputy Officer Commanding Station',
    description: 'Second-in-command. Same operational authority as OCS except cannot onboard officers or modify critical station settings.',
    onboardOfficers: false,
    createOb: true,
    custodyCells: true,
    auditViewer: true,
    fourEyesApprover: true,
    riskDashboard: true,
    caseAccess: 'ALL',
  },
  {
    role: 'DUTY_OFFICER_OB_CLERK',
    title: 'Duty Officer / OB Clerk',
    description: 'Front desk operations. Creates digital OB entries, books in brought-in persons, captures mugshots, property intake.',
    onboardOfficers: false,
    createOb: true,
    custodyCells: false,
    auditViewer: false,
    fourEyesApprover: false,
    riskDashboard: false,
    caseAccess: 'READ_ONLY',
  },
  {
    role: 'INVESTIGATING_OFFICER',
    title: 'Investigating Officer (IO)',
    description: 'Case investigations. Accesses assigned cases, uploads evidence, records case notes, court outcomes. Strictly isolated to assigned cases.',
    onboardOfficers: false,
    createOb: false,
    custodyCells: false,
    auditViewer: false,
    fourEyesApprover: false,
    riskDashboard: false,
    caseAccess: 'ASSIGNED',
  },
  {
    role: 'CELL_SERGEANT',
    title: 'Cell Sergeant',
    description: 'Custody management. Controls cell allocation, monitors the 24-hour statutory countdown clock, prisoner welfare, meals, property register.',
    onboardOfficers: false,
    createOb: false,
    custodyCells: true,
    auditViewer: false,
    fourEyesApprover: false,
    riskDashboard: false,
    caseAccess: 'NONE',
  },
  {
    role: 'RECORDS_CLERK',
    title: 'Records & Registry Clerk',
    description: 'Registry lookups. Search and print official records. Strictly read-only; no create, edit, or approval permissions.',
    onboardOfficers: false,
    createOb: false,
    custodyCells: false,
    auditViewer: false,
    fourEyesApprover: false,
    riskDashboard: false,
    caseAccess: 'READ_ONLY',
  },
  {
    role: 'AUDITOR',
    title: 'External Oversight Auditor',
    description: 'Independent oversight (IPOA / Internal Affairs). Read-only station-wide access to audit logs, anomaly flags, and public complaints against OCS.',
    onboardOfficers: false,
    createOb: false,
    custodyCells: false,
    auditViewer: true,
    fourEyesApprover: false,
    riskDashboard: true,
    caseAccess: 'ALL',
  },
  {
    role: 'ADMIN_SUPER_OWNER',
    title: 'Technical Break-Glass (LQD Creatives)',
    description: 'Emergency technical maintenance only. Zero access to operational case files or Occurrence Book records. Actions logged separately.',
    onboardOfficers: false,
    createOb: false,
    custodyCells: false,
    auditViewer: true,
    fourEyesApprover: false,
    riskDashboard: false,
    caseAccess: 'NONE',
  },
];

export const RolesPermissionsView: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Role-Based Access Control (RBAC) Architecture</h3>
            <p className="text-xs text-slate-400">
              Zero-trust enforcement backed by PostgreSQL Row-Level Security (RLS) on all 34 database tables.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Station Role</th>
              <th className="py-3 px-4">Onboard Officers</th>
              <th className="py-3 px-4">Create OB</th>
              <th className="py-3 px-4">Cell Custody</th>
              <th className="py-3 px-4">Audit Log</th>
              <th className="py-3 px-4">Four-Eyes Approver</th>
              <th className="py-3 px-4">Risk Radar</th>
              <th className="py-3 px-4">Case Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
            {ROLES_DATA.map((r) => (
              <tr key={r.role} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-100">{r.title}</div>
                  <div className="text-[10px] font-mono text-amber-400">{r.role}</div>
                  <div className="text-[11px] text-slate-400 mt-1 max-w-sm">{r.description}</div>
                </td>
                <td className="py-3 px-4">
                  {r.onboardOfficers ? (
                    <span className="inline-flex p-1 rounded bg-emerald-950 text-emerald-400"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex p-1 rounded bg-slate-800/50 text-slate-500"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {r.createOb ? (
                    <span className="inline-flex p-1 rounded bg-emerald-950 text-emerald-400"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex p-1 rounded bg-slate-800/50 text-slate-500"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {r.custodyCells ? (
                    <span className="inline-flex p-1 rounded bg-emerald-950 text-emerald-400"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex p-1 rounded bg-slate-800/50 text-slate-500"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {r.auditViewer ? (
                    <span className="inline-flex p-1 rounded bg-emerald-950 text-emerald-400"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex p-1 rounded bg-slate-800/50 text-slate-500"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {r.fourEyesApprover ? (
                    <span className="inline-flex p-1 rounded bg-emerald-950 text-emerald-400"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex p-1 rounded bg-slate-800/50 text-slate-500"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {r.riskDashboard ? (
                    <span className="inline-flex p-1 rounded bg-emerald-950 text-emerald-400"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex p-1 rounded bg-slate-800/50 text-slate-500"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="py-3 px-4 font-mono text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    r.caseAccess === 'ALL' ? 'bg-amber-950 text-amber-300' :
                    r.caseAccess === 'ASSIGNED' ? 'bg-cyan-950 text-cyan-300' :
                    r.caseAccess === 'READ_ONLY' ? 'bg-blue-950 text-blue-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {r.caseAccess}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
