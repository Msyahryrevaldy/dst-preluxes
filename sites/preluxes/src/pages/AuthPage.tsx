import { ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { PreluxesWordmark } from '../components/PreluxesWordmark.tsx';

export function AuthPage({ adminPortal = false }: { adminPortal?: boolean }) {
  const { firebaseUser, isAdmin, signIn, navigate, t } = useStore();

  if (firebaseUser) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-5">
        <div className="bg-white border border-[#30302E]/15 p-8 space-y-4">
          <div className="text-[26px] text-[#30302E]">
            <PreluxesWordmark />
          </div>
          <h1 className="font-serif text-2xl text-[#30302E]">{t.auth.alreadySignedIn}</h1>
          <p className="text-xs text-[#30302E]/70">{firebaseUser.email}</p>
          <div className="flex flex-col gap-2.5 pt-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="w-full py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
              >
                {t.auth.openAdmin}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="w-full py-2.5 border border-[#30302E]/25 text-sm font-medium hover:bg-[#FAF7F2]"
            >
              {t.auth.openAccount}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white border border-[#30302E]/15 p-8 text-center space-y-6">
        <div className="text-[26px] text-[#30302E]">
          <PreluxesWordmark />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-[#30302E]">
            {adminPortal ? t.auth.adminTitle : t.auth.customerTitle}
          </h1>
          <p className="text-sm text-[#30302E]/75 leading-relaxed">
            {adminPortal ? t.auth.adminDesc : t.auth.customerDesc}
          </p>
        </div>

        <button
          type="button"
          onClick={signIn}
          className="w-full py-3 px-5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#DFA691] transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t.auth.continueGoogle}</span>
        </button>

        <p className="text-xs text-[#30302E]/60">
          {t.auth.firebaseNote}
        </p>
      </div>
    </main>
  );
}
