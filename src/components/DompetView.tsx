import React, { useMemo, useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import type { StudioStoreState, UserAccount, WalletTransaction } from '../types/studio';
import { hasRolePermission } from '../utils/brandLogic';

interface DompetViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onAddTransaction: (tx: WalletTransaction) => void;
  onMarkPaid: (txId: string) => void;
}

export const DompetView: React.FC<DompetViewProps> = ({
  state,
  activeUser,
  onAddTransaction,
  onMarkPaid,
}) => {
  const canManage = hasRolePermission(activeUser.role, 'MANAGE_WALLET', state.activeClientId, activeUser.assignedClientIds);
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('Produksi Konten');
  const [description, setDescription] = useState('');
  const [amountIdr, setAmountIdr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const visibleTransactions = useMemo(() => {
    return state.walletTransactions.filter((t) =>
      filterClient === 'ALL' ? true : t.clientId === filterClient
    );
  }, [state.walletTransactions, filterClient]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of visibleTransactions) {
      if (tx.type === 'INCOME') income += tx.amountIdr;
      else expense += tx.amountIdr;
    }
    return { income, expense, net: income - expense };
  }, [visibleTransactions]);

  const formatIdr = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountIdr);
    if (!canManage || !description.trim() || !numericAmount || numericAmount <= 0) return;

    onAddTransaction({
      id: `tx-${Date.now().toString(36)}`,
      clientId: filterClient === 'ALL' ? state.activeClientId : filterClient,
      type,
      category,
      description: description.trim(),
      amountIdr: numericAmount,
      date,
      status: type === 'INCOME' ? 'PAID' : 'PENDING',
    });
    setDescription('');
    setAmountIdr('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Dompet & Manajemen Biaya</h1>
          <p className="text-sm text-slate-600 mt-1">
            Catatan arus kas produksi agensi per klien dalam Rupiah (IDR).
          </p>
        </div>
        <select
          aria-label="Filter klien dompet"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D]"
        >
          <option value="ALL">Semua Klien</option>
          {state.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#DDE3F2] bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Total Pemasukan</div>
          <div className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">{formatIdr(totals.income)}</div>
        </div>
        <div className="rounded-xl border border-[#DDE3F2] bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Total Pengeluaran</div>
          <div className="mt-1 text-xl font-bold text-amber-700 tabular-nums">{formatIdr(totals.expense)}</div>
        </div>
        <div className="rounded-xl border border-[#DDE3F2] bg-[#05349B] p-5 text-white">
          <div className="text-xs font-medium text-blue-100">Saldo Bersih Operasional</div>
          <div className="mt-1 text-xl font-bold text-[#FDCB02] tabular-nums">{formatIdr(totals.net)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Catat Transaksi */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
          <h2 className="text-base font-bold text-[#0F1B3D]">Catat Transaksi Baru</h2>
          {!canManage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Hanya peran ADMIN atau PM yang dapat mencatat transaksi keuangan.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(['EXPENSE', 'INCOME'] as const).map((tType) => (
              <button
                key={tType}
                type="button"
                onClick={() => setType(tType)}
                className={`py-2 rounded-lg text-xs font-bold border ${
                  type === tType
                    ? 'bg-[#05349B] text-white border-[#05349B]'
                    : 'bg-white text-[#0F1B3D] border-[#DDE3F2]'
                }`}
              >
                {tType === 'EXPENSE' ? 'Pengeluaran' : 'Pemasukan'}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="tx-category" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Kategori
            </label>
            <input
              id="tx-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="tx-desc" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Deskripsi
            </label>
            <input
              id="tx-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Talent voiceover episode 4"
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
                Nominal (IDR)
              </label>
              <input
                id="tx-amount"
                type="number"
                min={1000}
                value={amountIdr}
                onChange={(e) => setAmountIdr(e.target.value)}
                placeholder="1500000"
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm font-mono tabular-nums"
                required
              />
            </div>
            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
                Tanggal
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canManage}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#05349B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#042878] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Simpan Transaksi
          </button>
        </form>

        {/* Ledger Table */}
        <div className="lg:col-span-8 rounded-xl border border-[#DDE3F2] bg-white p-5 overflow-x-auto">
          <h2 className="text-base font-bold text-[#0F1B3D] mb-4">Buku Besar Transaksi</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#DDE3F2] text-slate-500">
                <th className="py-2 font-semibold">Tanggal</th>
                <th className="py-2 font-semibold">Klien</th>
                <th className="py-2 font-semibold">Kategori & Deskripsi</th>
                <th className="py-2 text-right font-semibold">Nominal</th>
                <th className="py-2 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3F2]/60">
              {visibleTransactions.map((tx) => {
                const clientName = state.clients.find((c) => c.id === tx.clientId)?.code || tx.clientId;
                return (
                  <tr key={tx.id} className="hover:bg-[#F4F6FC]/60">
                    <td className="py-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">{tx.date}</td>
                    <td className="py-3 font-semibold text-[#0F1B3D] whitespace-nowrap">{clientName}</td>
                    <td className="py-3">
                      <div className="font-semibold text-[#0F1B3D]">{tx.description}</div>
                      <div className="text-slate-500">{tx.category}</div>
                    </td>
                    <td
                      className={`py-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                        tx.type === 'INCOME' ? 'text-emerald-700' : 'text-[#0F1B3D]'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'} {formatIdr(tx.amountIdr)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {tx.status === 'PAID' ? (
                        <span className="text-emerald-700 font-semibold">LUNAS</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => canManage && onMarkPaid(tx.id)}
                          disabled={!canManage}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Tandai Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
