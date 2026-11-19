import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Terjadi kesalahan pada aplikasi.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#30302E] flex items-center justify-center px-6 py-16">
          <div className="max-w-lg w-full border border-[#30302E]/15 bg-white p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#30302E]/60 mb-2">Preluxes</p>
            <h1 className="font-serif text-2xl mb-3">Terjadi kendala saat memuat halaman</h1>
            <p className="text-sm text-[#30302E]/75 mb-6 leading-relaxed">
              Silakan muat ulang halaman. Jika kendala terkait akses data atau autentikasi berlanjut, pastikan Anda masuk dengan akun yang sesuai.
            </p>
            <p className="text-xs font-mono bg-[#FAF7F2] p-3 border border-[#30302E]/10 mb-6 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-sm font-medium hover:bg-[#30302E]/90 transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
