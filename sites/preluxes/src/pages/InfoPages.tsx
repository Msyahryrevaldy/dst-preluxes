import { ExternalLink, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsappChatUrl } from '../utils/commerce.ts';

export function InfoPage({
  page,
  policySlug,
}: {
  page: 'about' | 'contact' | 'faq' | 'policy';
  policySlug?: string;
}) {
  const { cms, settings, navigate, lang, t } = useStore();

  if (page === 'about') {
    const aboutTitle = lang === 'id' ? cms.aboutTitle : t.hero.defaultAboutTitle;
    const aboutBody = lang === 'id' ? cms.aboutBody : t.hero.defaultAboutBody;
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-12">
        <header className="space-y-4 border-b border-[#30302E]/12 pb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#30302E]/60">{t.info.aboutKicker}</p>
          <h1 className="font-serif text-4xl text-[#30302E] text-balance">{aboutTitle}</h1>
          <p className="text-base text-[#30302E]/80 leading-relaxed">{aboutBody}</p>
        </header>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-[#30302E]">{cms.carePromiseTitle}</h2>
          <p className="text-sm text-[#30302E]/80 leading-relaxed">{cms.carePromiseBody}</p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-[#30302E]">{t.info.gradesHeading}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['A', 'B', 'C', 'D'] as const).map((grade) => (
              <div key={grade} className="bg-white border border-[#30302E]/12 p-5">
                <h3 className="font-serif text-base text-[#30302E] mb-1">{t.product.grades[grade].title}</h3>
                <p className="text-xs text-[#30302E]/75 leading-relaxed">{t.product.grades[grade].summary}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (page === 'contact') {
    const waUrl = buildWhatsappChatUrl(settings.contactWhatsapp, t.chatAdmin.topics[0]);
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#30302E]/60">{t.info.contactKicker}</p>
        <h1 className="font-serif text-4xl text-[#30302E]">{t.info.contactHeading}</h1>
        <p className="text-sm text-[#30302E]/80 leading-relaxed">
          {t.info.contactIntro}
        </p>
        <div className="bg-white border border-[#30302E]/12 p-6 space-y-4 text-sm">
          <p>
            <span className="text-[#30302E]/60 block text-xs">Email</span>
            <span className="font-medium">{settings.contactEmail}</span>
          </p>
          <p>
            <span className="text-[#30302E]/60 block text-xs">WhatsApp</span>
            <span className="font-medium">{settings.contactWhatsapp}</span>
          </p>
          <p>
            <span className="text-[#30302E]/60 block text-xs">Instagram</span>
            <span className="font-medium">{settings.instagramHandle}</span>
          </p>
          <p>
            <span className="text-[#30302E]/60 block text-xs">{t.info.handlingLabel}</span>
            <span>{settings.handlingTimeText}</span>
          </p>
          <div className="pt-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold hover:bg-[#DFA691]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.chatAdmin.sendWhatsapp}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (page === 'faq') {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
        <header className="border-b border-[#30302E]/12 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#30302E]/60 mb-2">{t.info.faqKicker}</p>
          <h1 className="font-serif text-4xl text-[#30302E]">{t.info.faqHeading}</h1>
        </header>
        <div className="space-y-4">
          {cms.faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-[#30302E]/12 p-6">
              <h2 className="font-serif text-lg text-[#30302E] mb-2">{faq.question}</h2>
              <p className="text-sm text-[#30302E]/80 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const policyMap: Record<string, { title: string; body: string }> = {
    shipping: { title: t.info.policies.shipping, body: settings.shippingPolicyText },
    returns: { title: t.info.policies.returns, body: settings.returnPolicyText },
    cancellation: { title: t.info.policies.cancellation, body: settings.cancellationPolicyText },
    privacy: { title: t.info.policies.privacy, body: settings.privacyPolicyText },
    terms: { title: t.info.policies.terms, body: settings.termsPolicyText },
  };
  const current = policyMap[policySlug || 'shipping'] || policyMap.shipping;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-[#30302E]/12 pb-4">
        {Object.entries(policyMap).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(`/policies/${key}`)}
            className={`px-3 py-1.5 text-xs font-medium ${
              (policySlug || 'shipping') === key
                ? 'bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 font-semibold'
                : 'bg-white border border-[#30302E]/15 text-[#30302E]'
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className="bg-white border border-[#30302E]/12 p-8 space-y-4">
        <h1 className="font-serif text-3xl text-[#30302E]">{current.title}</h1>
        <p className="text-sm text-[#30302E]/85 leading-relaxed whitespace-pre-line">{current.body}</p>
      </div>
    </main>
  );
}
