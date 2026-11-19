import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { StudioStoreState, UserAccount } from '../types/studio';
import { getApprovedGuidelineVersion } from '../utils/brandLogic';

interface BrandReportsViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
}

export const BrandReportsView: React.FC<BrandReportsViewProps> = ({ state, activeUser }) => {
  const [clientFilter, setClientFilter] = useState('ALL');

  const visibleClients = useMemo(() => {
    const base =
      activeUser.role === 'ADMIN' || activeUser.assignedClientIds.length === 0
        ? state.clients
        : state.clients.filter((c) => activeUser.assignedClientIds.includes(c.id));
    return clientFilter === 'ALL' ? base : base.filter((c) => c.id === clientFilter);
  }, [state.clients, activeUser, clientFilter]);

  const rows = useMemo(() => {
    return visibleClients.map((client) => {
      const ws = state.workspaces.find((w) => w.clientId === client.id);
      const guideline = ws ? state.guidelines[ws.id] : undefined;
      const approved = getApprovedGuidelineVersion(guideline);
      const docs = state.assets.filter((a) => a.clientId === client.id).length;
      const campaigns = state.creativeDirections.filter((c) => c.clientId === client.id).length;
      const socials = state.socialContents.filter((s) => s.clientId === client.id).length;
      const audits = state.visualAudits.filter((v) => v.clientId === client.id);
      const avgScore =
        audits.length > 0
          ? Math.round(audits.reduce((sum, a) => sum + a.overallScore, 0) / audits.length)
          : null;

      return {
        client,
        ws,
        approvedVersion: approved ? `v${approved.versionNumber}` : 'Belum Approved',
        docs,
        campaigns,
        socials,
        auditsCount: audits.length,
        avgScore,
      };
    });
  }, [visibleClients, state]);

  const handleExportReportCsv = () => {
    const headers = [
      'Client',
      'Code',
      'Guideline',
      'Documents',
      'Creative Campaigns',
      'Social Content',
      'Visual Audits',
      'Avg Compliance Score',
    ];
    const csvRows = rows.map((r) =>
      [
        r.client.name,
        r.client.code,
        r.approvedVersion,
        r.docs,
        r.campaigns,
        r.socials,
        r.auditsCount,
        r.avgScore !== null ? `${r.avgScore}%` : 'N/A',
      ]
        .map((c) => `"${String(c).replaceAll('"', '""')}"`)
        .join(',')
    );
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dst-brand-intelligence-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Brand Intelligence Reports</h1>
          <p className="text-sm text-slate-600 mt-1">
            Matriks kepatuhan merek, adopsi pedoman APPROVED, dan volume produksi lintas klien.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto max-w-full">
          <select
            aria-label="Filter klien laporan"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="min-w-0 max-w-full flex-1 sm:flex-none rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D]"
          >
            <option value="ALL">Semua Klien</option>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportReportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor Laporan CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#DDE3F2] bg-white p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#DDE3F2] text-slate-500">
              <th className="py-2.5 font-semibold">Klien / Brand</th>
              <th className="py-2.5 font-semibold">Guideline Aktif</th>
              <th className="py-2.5 text-right font-semibold">Dokumen</th>
              <th className="py-2.5 text-right font-semibold">Kampanye</th>
              <th className="py-2.5 text-right font-semibold">Konten Sosial</th>
              <th className="py-2.5 text-right font-semibold">Audit Visual</th>
              <th className="py-2.5 text-right font-semibold">Skor Kepatuhan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE3F2]/60">
            {rows.map((r) => (
              <tr key={r.client.id} className="hover:bg-[#F4F6FC]/60">
                <td className="py-3">
                  <div className="font-bold text-[#0F1B3D]">{r.client.name}</div>
                  <div className="text-[11px] text-slate-500">{r.client.industry}</div>
                </td>
                <td className="py-3 font-mono font-semibold text-[#05349B]">{r.approvedVersion}</td>
                <td className="py-3 text-right font-mono tabular-nums">{r.docs}</td>
                <td className="py-3 text-right font-mono tabular-nums">{r.campaigns}</td>
                <td className="py-3 text-right font-mono tabular-nums">{r.socials}</td>
                <td className="py-3 text-right font-mono tabular-nums">{r.auditsCount}</td>
                <td className="py-3 text-right font-mono tabular-nums font-bold text-[#0F1B3D]">
                  {r.avgScore !== null ? `${r.avgScore}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
