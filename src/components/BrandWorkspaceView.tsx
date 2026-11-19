import React, { useState } from 'react';
import { Plus, Save, Building2, ArrowRight } from 'lucide-react';
import type { ActiveRoute, BrandWorkspace, ClientRecord, StudioStoreState, UserAccount } from '../types/studio';
import {
  getApprovedGuidelineVersion,
  hasRolePermission,
  isolateByClient,
} from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';

interface BrandWorkspaceViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onSelectClient: (clientId: string) => void;
  onUpdateWorkspace: (ws: BrandWorkspace) => void;
  onCreateClientWorkspace: (client: ClientRecord, workspace: BrandWorkspace) => void;
  onNavigate: (route: ActiveRoute) => void;
}

export const BrandWorkspaceView: React.FC<BrandWorkspaceViewProps> = ({
  state,
  activeUser,
  onSelectClient,
  onUpdateWorkspace,
  onCreateClientWorkspace,
  onNavigate,
}) => {
  const canCreateClient = hasRolePermission(activeUser.role, 'CREATE_CLIENT');
  const canEditWorkspace = hasRolePermission(
    activeUser.role,
    'EDIT_WORKSPACE',
    state.activeClientId,
    activeUser.assignedClientIds
  );

  const visibleClients =
    activeUser.role === 'ADMIN' || activeUser.assignedClientIds.length === 0
      ? state.clients
      : state.clients.filter((c) => activeUser.assignedClientIds.includes(c.id));

  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [editDraft, setEditDraft] = useState<BrandWorkspace | null>(null);
  const currentWs = editDraft && editDraft.id === activeWorkspace?.id ? editDraft : activeWorkspace;

  const clientAssets = isolateByClient(state.assets, state.activeClientId);
  const clientDirections = isolateByClient(state.creativeDirections, state.activeClientId);
  const clientSocials = isolateByClient(state.socialContents, state.activeClientId);
  const clientAudits = isolateByClient(state.visualAudits, state.activeClientId);
  const activeGuideline = activeWorkspace ? state.guidelines[activeWorkspace.id] : undefined;
  const approvedVersion = getApprovedGuidelineVersion(activeGuideline);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateClient || !newClientName.trim() || !newBrandName.trim()) return;
    setCreateError(null);
    try {
      const res = await apiRequest<{ ok: boolean; client: ClientRecord; workspace: BrandWorkspace }>(
        '/api/brand/workspaces',
        activeUser,
        {
          body: {
            clientName: newClientName.trim(),
            clientCode: newClientCode.trim() || newClientName.trim().slice(0, 3).toUpperCase(),
            brandName: newBrandName.trim(),
            industry: newIndustry.trim() || 'Creative & Digital',
          },
        }
      );
      onCreateClientWorkspace(res.client, res.workspace);
      onSelectClient(res.client.id);
      setShowAddForm(false);
      setNewClientName('');
      setNewClientCode('');
      setNewBrandName('');
      setNewIndustry('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat workspace klien baru.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs || !canEditWorkspace) return;
    onUpdateWorkspace({ ...currentWs, updatedAt: new Date().toISOString() });
    try {
      await apiRequest(`/api/brand/workspaces/${currentWs.id}`, activeUser, {
        method: 'PATCH',
        body: currentWs,
      });
      setSaveMessage('Profil Brand Workspace berhasil disimpan.');
    } catch {
      setSaveMessage('Disimpan ke penyimpanan workspace lokal.');
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Brand Workspace Multi-Klien</h1>
          <p className="text-sm text-slate-600 mt-1">
            Setiap klien memiliki ruang kerja merek terisolasi penuh (dokumen, pedoman, kampanye, dan audit tidak pernah tercampur).
          </p>
        </div>

        {canCreateClient && (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#042878] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Tambah Klien & Brand Workspace
          </button>
        )}
      </div>

      {showAddForm && canCreateClient && (
        <form
          onSubmit={handleCreateWorkspace}
          className="rounded-xl border border-[#05349B] bg-white p-5 space-y-4"
        >
          <h2 className="text-sm font-bold text-[#0F1B3D]">Buat Klien & Brand Workspace Baru (Admin)</h2>
          {createError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {createError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Nama Klien (mis. Nusantara Tech)"
              className="rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
              required
            />
            <input
              value={newClientCode}
              onChange={(e) => setNewClientCode(e.target.value)}
              placeholder="Kode (mis. NST)"
              maxLength={6}
              className="rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm font-mono uppercase"
            />
            <input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Nama Brand Resmi"
              className="rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
              required
            />
            <input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="Industri"
              className="rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-[#DDE3F2] px-4 py-2 text-xs font-semibold text-[#0F1B3D]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white"
            >
              Buat Workspace
            </button>
          </div>
        </form>
      )}

      {/* Client Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleClients.map((client) => {
          const ws = state.workspaces.find((w) => w.clientId === client.id);
          const gl = ws ? state.guidelines[ws.id] : undefined;
          const approved = getApprovedGuidelineVersion(gl);
          const isSelected = client.id === state.activeClientId;

          return (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                onSelectClient(client.id);
                setEditDraft(null);
              }}
              className={`text-left rounded-xl border p-4 bg-white transition-colors ${
                isSelected ? 'border-[#05349B] ring-1 ring-[#05349B]' : 'border-[#DDE3F2] hover:border-[#05349B]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[#05349B]">{client.code}</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {approved ? `Guideline v${approved.versionNumber} APPROVED` : 'Draft / Belum Disetujui'}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-bold text-[#0F1B3D] truncate">{client.name}</div>
              <div className="mt-0.5 text-xs text-slate-500 truncate">{client.industry}</div>
            </button>
          );
        })}
      </div>

      {/* Active Isolated Workspace Detail */}
      {currentWs && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Profile Editor */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-8 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#DDE3F2] pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-[#05349B]" />
                <div>
                  <h2 className="text-base font-bold text-[#0F1B3D]">{currentWs.brandName}</h2>
                  <div className="text-xs text-slate-500">
                    Workspace ID: <span className="font-mono">{currentWs.id}</span> · Client ID:{' '}
                    <span className="font-mono">{currentWs.clientId}</span>
                  </div>
                </div>
              </div>
              {canEditWorkspace && (
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan Profil
                </button>
              )}
            </div>

            {saveMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
                {saveMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Profil Perusahaan</label>
                <textarea
                  rows={3}
                  disabled={!canEditWorkspace}
                  value={currentWs.companyProfile}
                  onChange={(e) => setEditDraft({ ...currentWs, companyProfile: e.target.value })}
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Target Audiens</label>
                <textarea
                  rows={3}
                  disabled={!canEditWorkspace}
                  value={currentWs.targetAudience}
                  onChange={(e) => setEditDraft({ ...currentWs, targetAudience: e.target.value })}
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Produk & Layanan</label>
                <textarea
                  rows={2}
                  disabled={!canEditWorkspace}
                  value={currentWs.productsServices}
                  onChange={(e) => setEditDraft({ ...currentWs, productsServices: e.target.value })}
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Positioning & UVP</label>
                <textarea
                  rows={2}
                  disabled={!canEditWorkspace}
                  value={currentWs.uvp}
                  onChange={(e) => setEditDraft({ ...currentWs, uvp: e.target.value })}
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Misi</label>
                <input
                  disabled={!canEditWorkspace}
                  value={currentWs.mission}
                  onChange={(e) => setEditDraft({ ...currentWs, mission: e.target.value })}
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Visi</label>
                <input
                  disabled={!canEditWorkspace}
                  value={currentWs.vision}
                  onChange={(e) => setEditDraft({ ...currentWs, vision: e.target.value })}
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
            </div>
          </form>

          {/* Isolated Modules Summary */}
          <div className="lg:col-span-4 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F1B3D]">Inventaris Terisolasi Klien</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Dokumen & Aset Brand', count: clientAssets.length, route: 'brand-intelligence' as ActiveRoute },
                {
                  label: 'Versi Brand Guideline',
                  count: activeGuideline?.versions.length ?? 0,
                  route: 'brand-guidelines' as ActiveRoute,
                },
                { label: 'Proyek Creative Direction', count: clientDirections.length, route: 'creative-direction' as ActiveRoute },
                { label: 'Item Kalender Sosial', count: clientSocials.length, route: 'social-studio' as ActiveRoute },
                { label: 'Riwayat Audit Visual', count: clientAudits.length, route: 'visual-checker' as ActiveRoute },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => onNavigate(row.route)}
                  className="w-full flex items-center justify-between rounded-lg border border-[#DDE3F2] px-3 py-2.5 hover:border-[#05349B]"
                >
                  <span className="font-medium text-[#0F1B3D]">{row.label}</span>
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#05349B] tabular-nums">
                    {row.count}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs space-y-1">
              <div className="font-semibold text-[#0F1B3D]">Folder Brand Library</div>
              <div className="text-slate-600">{currentWs.brandLibraryFolderName || 'Studio DST - Brand Library'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
