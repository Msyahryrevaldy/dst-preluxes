import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsappChatUrl } from '../utils/commerce.ts';

export function ChatAdminWidget() {
  const { settings, currentPath, products, t, notify } = useStore();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const isPdp = currentPath.startsWith('/product/');
  const activeProduct = isPdp
    ? products.find((p) => p.slug === currentPath.slice('/product/'.length))
    : undefined;

  useEffect(() => {
    if (!open) return;
    if (activeProduct && !message.trim()) {
      setMessage(
        `${t.chatAdmin.topics[0]} — ${activeProduct.name} (${activeProduct.sku})`
      );
    } else if (!message.trim()) {
      setMessage(t.chatAdmin.topics[0]);
    }
  }, [open, activeProduct, message, t.chatAdmin.topics]);

  const handleSelectTopic = (topic: string) => {
    const suffix = activeProduct ? ` (${activeProduct.name} - ${activeProduct.sku})` : '';
    setMessage(`${topic}${suffix}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Clipboard tidak tersedia.', 'info');
    }
  };

  const waHref = buildWhatsappChatUrl(settings.contactWhatsapp, message || t.chatAdmin.topics[0]);
  const positionClass = isPdp ? 'bottom-20 right-4 lg:bottom-6 lg:right-6' : 'bottom-5 right-5';

  return (
    <div className={`fixed ${positionClass} z-40 flex flex-col items-end gap-3`}>
      {open && (
        <section
          role="dialog"
          aria-label={t.chatAdmin.title}
          data-testid="chat-admin-popup"
          className="w-[min(calc(100vw-2rem),350px)] bg-white border border-[#30302E]/25 shadow-2xl overflow-hidden"
        >
          <div className="bg-[#E9BBAA] text-[#30302E] px-4 py-3.5 border-b border-[#30302E]/15 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-base font-semibold leading-tight">
                {t.chatAdmin.title}
              </h2>
              <p className="text-[11px] text-[#30302E]/85 mt-0.5 leading-snug">
                {t.chatAdmin.subtitle}
              </p>
              <p className="text-[10px] font-mono text-[#30302E]/75 mt-1">
                {t.chatAdmin.hours} · {settings.contactWhatsapp}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat admin"
              className="w-8 h-8 flex items-center justify-center text-[#30302E] hover:bg-[#30302E]/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3.5 bg-[#FAF7F2]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#30302E]/70 mb-2">
                {t.chatAdmin.quickTopicsLabel}
              </p>
              <div className="flex flex-col gap-1.5">
                {t.chatAdmin.topics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    className="text-left text-xs px-3 py-2 bg-white border border-[#30302E]/15 text-[#30302E] hover:bg-[#E9BBAA]/30 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="chat-admin-message" className="block text-[11px] font-semibold uppercase tracking-wider text-[#30302E]/70 mb-1.5">
                {t.chatAdmin.messageLabel}
              </label>
              <textarea
                id="chat-admin-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.chatAdmin.placeholder}
                className="w-full px-3 py-2 text-xs bg-white border border-[#30302E]/20 text-[#30302E] placeholder:text-[#30302E]/45"
              />
            </div>

            <div className="flex items-center gap-2">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#DFA691] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{t.chatAdmin.sendWhatsapp}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2.5 bg-white border border-[#30302E]/20 text-xs font-medium text-[#30302E] inline-flex items-center gap-1 hover:bg-[#E9BBAA]/20"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.chatAdmin.copied : t.chatAdmin.copyText}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.chatAdmin.fabLabel}
        aria-expanded={open}
        data-testid="chat-admin-fab"
        className="inline-flex items-center gap-2 px-4 py-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/30 shadow-lg hover:bg-[#DFA691] transition-colors text-xs font-semibold whitespace-nowrap shrink-0"
      >
        {open ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" strokeWidth={1.8} />}
        <span>{t.chatAdmin.fabLabel}</span>
      </button>
    </div>
  );
}
