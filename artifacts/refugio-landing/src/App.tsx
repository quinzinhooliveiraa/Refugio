import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowRight, Check, ChevronDown, EyeOff, HeartHandshake, LockKeyhole, Mail, Menu, Quote, ShieldCheck, Sparkles, X } from 'lucide-react';

type Intent = 'share' | 'help' | 'both';

const FUTURE_FORM_ENDPOINT = import.meta.env.VITE_REFUGIO_FORM_ENDPOINT ?? '/api/waitlist';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, className: visible ? 'reveal is-visible' : 'reveal' };
}

function Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2" data-testid="brand-refugio">
      <svg width="29" height="29" viewBox="0 0 29 29" aria-hidden="true" className={inverse ? 'text-[#f3eee4]' : 'text-[#183d3b]'}>
        <path d="M4 24.5V10.9C4 7.1 7.1 4 10.9 4h3.5c5.9 0 10.6 4.7 10.6 10.6v9.9h-5.5v-8.8c0-3.4-2.2-5.9-5.7-5.9h-1.6v14.7H4Z" fill="currentColor" />
        <path d="M9.4 8.1c1.9 0 3.5-1.1 4.2-2.7" stroke="#d8785c" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="text-[1.05rem] font-bold tracking-[-.04em]">refúgio</span>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="relative min-h-[410px] overflow-hidden rounded-[2rem] border border-[#183d3b]/20 bg-[#c8c1d4] md:min-h-[590px]" aria-label="Ilustração abstrata de uma porta aberta para um espaço de escuta" role="img">
      <div className="orb absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#183d3b]/20 bg-[#d8785c]/65 md:h-72 md:w-72" />
      <div className="orb-delay absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-[#183d3b]/15 bg-[#b7cfc0]/80 md:h-80 md:w-80" />
      <svg viewBox="0 0 560 620" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M100 620V288C100 149 180 63 280 63s180 86 180 225v332" fill="none" stroke="#183d3b" strokeWidth="2" opacity=".25" />
        <path d="M152 620V302c0-101 50-164 128-164s128 63 128 164v318" fill="#183d3b" opacity=".95" />
        <path d="M199 620V312c0-69 29-111 81-111s81 42 81 111v308" fill="#f3eee4" />
        <path d="M280 202v418" stroke="#d8785c" strokeWidth="2" strokeDasharray="4 9" opacity=".8" />
        <circle cx="280" cy="272" r="9" fill="#d8785c" />
        <path d="M280 275c-45 50-62 104-49 163 12 54 31 89 49 116 18-27 37-62 49-116 13-59-4-113-49-163Z" fill="#b7cfc0" opacity=".85" />
        <path d="M280 302c-19 43-27 81-20 122 6 35 14 61 20 78 6-17 14-43 20-78 7-41-1-79-20-122Z" fill="#d8785c" opacity=".8" />
        <g fill="#183d3b" opacity=".55">
          <circle cx="88" cy="122" r="3" /><circle cx="466" cy="188" r="3" /><circle cx="438" cy="98" r="2" /><circle cx="125" cy="212" r="2" />
        </g>
        <g stroke="#183d3b" strokeWidth="1" opacity=".32">
          <path d="M88 122h27l10 90" /><path d="M438 98l28 90" />
        </g>
      </svg>
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between md:bottom-7 md:left-7 md:right-7">
        <p className="max-w-[15rem] text-[.74rem] leading-relaxed text-[#f3eee4]/80">um lugar para baixar a guarda, sem precisar explicar tudo</p>
        <span className="rounded-full border border-[#f3eee4]/40 px-3 py-1.5 text-[.65rem] font-semibold uppercase tracking-[.16em] text-[#f3eee4]/80">em construção</span>
      </div>
    </div>
  );
}

function IntentOption({ intent, title, copy, selected, onSelect }: { intent: Intent; title: string; copy: string; selected: boolean; onSelect: (intent: Intent) => void }) {
  return (
    <button type="button" className={`intent-card ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(intent)} data-testid={`button-intent-${intent}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="text-[1.02rem] font-bold tracking-[-.025em]">{title}</span>
        <span className="intent-check" aria-hidden="true">{selected && <Check size={13} strokeWidth={3} />}</span>
      </span>
      <span className="mt-8 block text-[.78rem] leading-[1.45] text-[#183d3b]/70">{copy}</span>
    </button>
  );
}

function SignupForm() {
  const [email, setEmail] = useState('');
  const [intent, setIntent] = useState<Intent | ''>('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Confira o e-mail — precisamos de um endereço válido.');
      return;
    }
    if (!intent) {
      setError('Escolha como você gostaria de chegar ao Refúgio.');
      return;
    }
    setError('');
    // Integration point: send { email: cleanEmail, intent } to FUTURE_FORM_ENDPOINT when the endpoint exists.
    try {
      window.localStorage.setItem('refugio-waitlist', JSON.stringify({ email: cleanEmail, intent, createdAt: new Date().toISOString() }));
    } catch {
      // Local storage is optional; success feedback should still work in restricted browsers.
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[390px] flex-col justify-between rounded-[1.5rem] bg-[#183d3b] p-6 text-[#f3eee4] md:p-8" data-testid="status-signup-success">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b7cfc0] text-[#183d3b]"><Check size={22} /></div>
        <div>
          <p className="eyebrow !text-[#d8785c]">anotado com cuidado</p>
          <h3 className="serif mt-3 text-4xl leading-[.98]">A gente se encontra do lado de dentro.</h3>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#f3eee4]/70">Seu interesse ficou salvo neste dispositivo. Quando o Refúgio estiver pronto para abrir as portas, vamos te contar.</p>
        </div>
        <p className="text-xs text-[#f3eee4]/50">Nenhuma mensagem automática será enviada nesta fase.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.5rem] border border-[#183d3b]/20 bg-[#f3eee4]/80 p-5 md:p-7" data-testid="form-waitlist">
      <div className="mb-7">
        <p className="eyebrow">chegue primeiro</p>
        <h3 className="serif mt-2 text-3xl leading-[1.02]">Quer fazer parte do começo?</h3>
      </div>
      <div className="space-y-2">
        <label htmlFor="refugio-email" className="text-xs font-bold">Seu melhor e-mail</label>
        <div className="relative">
          <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#183d3b]/50" />
          <input id="refugio-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} placeholder="voce@exemplo.com" className="email-field pl-11" aria-invalid={Boolean(error && !email)} aria-describedby={error ? 'signup-error' : 'signup-hint'} data-testid="input-email" />
        </div>
        <p id="signup-hint" className="text-[.7rem] text-[#183d3b]/55">Só vamos usar para avisar sobre os próximos passos.</p>
      </div>
      <fieldset className="mt-7">
        <legend className="mb-3 text-xs font-bold">Eu quero...</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <IntentOption intent="share" title="Ser ouvido" copy="Tenho algo para colocar para fora." selected={intent === 'share'} onSelect={(value) => { setIntent(value); setError(''); }} />
          <IntentOption intent="help" title="Oferecer apoio" copy="Quero estar presente para alguém." selected={intent === 'help'} onSelect={(value) => { setIntent(value); setError(''); }} />
          <IntentOption intent="both" title="Os dois" copy="Quero alternar entre os dois lados." selected={intent === 'both'} onSelect={(value) => { setIntent(value); setError(''); }} />
        </div>
      </fieldset>
      {error && <p id="signup-error" role="alert" className="mt-4 text-xs font-semibold text-[#a7493c]" data-testid="status-signup-error">{error}</p>}
      <button type="submit" className="button-primary mt-7 w-full" data-testid="button-submit-signup">Quero saber quando abrir <ArrowRight size={16} /></button>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[.68rem] leading-relaxed text-[#183d3b]/55"><LockKeyhole size={12} /> Sem feed. Sem exposição. Sem spam.</p>
    </form>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const story = useReveal();
  const principles = useReveal();
  const formSection = useReveal();

  useEffect(() => {
    document.title = 'Refúgio — um lugar para ser ouvido';
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="refugio-page grain">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <a href="#top" className="nav-link" aria-label="Voltar ao início" data-testid="link-home"><Mark /></a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          <a href="#como-funciona" className="nav-link" data-testid="link-how-it-works">Como funciona</a>
          <a href="#por-que" className="nav-link" data-testid="link-why">Por que existe</a>
          <a href="#entrar" className="button-quiet" data-testid="link-join">Quero entrar <ArrowDownRight size={14} /></a>
        </nav>
        <button type="button" className="focus-ring rounded-full p-2 md:hidden" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} data-testid="button-toggle-menu">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>
      {menuOpen && (
        <nav className="absolute left-5 right-5 top-[4.7rem] z-30 rounded-2xl border border-[#183d3b]/20 bg-[#f3eee4] p-4 shadow-xl md:hidden" aria-label="Navegação móvel">
          <a href="#como-funciona" onClick={closeMenu} className="block border-b border-[#183d3b]/10 py-3 text-sm font-semibold" data-testid="mobile-link-how-it-works">Como funciona</a>
          <a href="#por-que" onClick={closeMenu} className="block border-b border-[#183d3b]/10 py-3 text-sm font-semibold" data-testid="mobile-link-why">Por que existe</a>
          <a href="#entrar" onClick={closeMenu} className="block py-3 text-sm font-semibold text-[#b85d47]" data-testid="mobile-link-join">Quero entrar</a>
        </nav>
      )}

      <section id="top" className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.05fr_.95fr] md:items-center md:gap-16 md:px-10 md:pb-32 md:pt-16">
        <div className="max-w-2xl">
          <div className="reveal is-visible flex items-center gap-3" data-testid="text-hero-eyebrow"><span className="h-px w-9 bg-[#d8785c]" /><span className="eyebrow">uma ideia em voz baixa</span></div>
          <h1 className="serif reveal reveal-delay-1 is-visible mt-6 text-[clamp(3.7rem,9vw,7.8rem)] leading-[.87] text-[#183d3b]" data-testid="text-hero-title">Ser ouvido<br /><span className="ml-[.38em] text-[#d8785c]">sem se expor.</span></h1>
          <p className="reveal reveal-delay-2 is-visible mt-8 max-w-lg text-[1.06rem] leading-[1.55] text-[#183d3b]/72 md:mt-10 md:text-[1.2rem]">Refúgio é um espaço anônimo para dividir o que pesa, encontrar escuta de verdade e oferecer apoio — sem curtidas, sem palco, sem precisar sustentar uma versão de si.</p>
          <div className="reveal reveal-delay-3 is-visible mt-9 flex flex-wrap items-center gap-6 md:mt-11">
            <a href="#entrar" className="button-primary" data-testid="button-hero-join">Quero conhecer o Refúgio <ArrowDownRight size={16} /></a>
            <span className="max-w-[10rem] text-[.7rem] leading-relaxed text-[#183d3b]/55">uma pesquisa de interesse, não uma promessa pronta</span>
          </div>
        </div>
        <HeroArtwork />
      </section>

      <section className="border-y border-[#183d3b]/15 bg-[#183d3b] px-5 py-7 text-[#f3eee4] md:px-10 md:py-9">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-[1.12rem] leading-snug md:text-[1.4rem]">Nem todo pedido de ajuda quer virar anúncio.<br /><span className="text-[#b7cfc0]">Nem todo gesto de cuidado precisa de aplauso.</span></p>
          <div className="flex items-center gap-3 text-xs text-[#f3eee4]/55"><span className="h-2 w-2 rounded-full bg-[#d8785c]" /> desenhado para relações mais honestas</div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto w-full max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <div ref={story.ref} className={story.className}>
          <div className="grid gap-12 md:grid-cols-[.72fr_1.28fr] md:gap-24">
            <div>
              <p className="eyebrow">o que estamos imaginando</p>
              <h2 className="serif mt-4 max-w-md text-5xl leading-[.95] md:text-6xl">A internet pode caber numa conversa.</h2>
              <p className="mt-6 max-w-sm text-sm leading-[1.65] text-[#183d3b]/65">O Refúgio nasce de uma pergunta simples: o que mudaria se a nossa presença não precisasse ser uma performance?</p>
            </div>
            <div className="grid gap-0 border-t border-[#183d3b]/20">
              {[
                { number: '01', icon: EyeOff, title: 'Você chega sem personagem', copy: 'Escolha o que quer compartilhar. Nome, foto e histórico não são o centro — sua experiência é.' },
                { number: '02', icon: HeartHandshake, title: 'Alguém responde com presença', copy: 'Pessoas entram para escutar e apoiar, não para colecionar seguidores. A troca importa mais que a visibilidade.' },
                { number: '03', icon: ShieldCheck, title: 'O cuidado também tem limite', copy: 'Moderação, privacidade e clareza desde o começo. Um espaço humano precisa ser responsável.' },
              ].map(({ number, icon: Icon, title, copy }) => (
                <div key={number} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-[#183d3b]/20 py-7 md:grid-cols-[4.5rem_1fr] md:gap-7">
                  <div className="flex flex-col items-start gap-4"><span className="text-xs font-bold text-[#d8785c]">{number}</span><Icon size={20} strokeWidth={1.6} /></div>
                  <div><h3 className="text-lg font-bold tracking-[-.025em]">{title}</h3><p className="mt-2 max-w-lg text-sm leading-[1.6] text-[#183d3b]/62">{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="por-que" className="paper-crease relative overflow-hidden px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div ref={principles.ref} className={principles.className}>
            <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
              <div><p className="eyebrow">um outro ritmo</p><h2 className="serif mt-4 max-w-2xl text-5xl leading-[.94] md:text-7xl">Menos vitrine.<br /><span className="text-[#b85d47]">Mais verdade.</span></h2></div>
              <p className="max-w-xs text-sm leading-[1.65] text-[#183d3b]/65">Não estamos tentando consertar ninguém. Estamos tentando abrir espaço para que uma pessoa não precise atravessar tudo sozinha.</p>
            </div>
            <div className="mt-16 grid gap-4 md:mt-24 md:grid-cols-3">
              <article className="rounded-[1.4rem] bg-[#b7cfc0] p-6 md:p-7"><Sparkles size={22} strokeWidth={1.6} /><h3 className="mt-16 text-2xl font-bold tracking-[-.04em]">Anônimo por escolha</h3><p className="mt-3 text-sm leading-relaxed text-[#183d3b]/70">Você decide o quanto quer revelar. Acolhimento não deveria depender de uma identidade pública.</p></article>
              <article className="rounded-[1.4rem] bg-[#d8785c] p-6 text-[#f3eee4] md:mt-12 md:p-7"><Quote size={22} strokeWidth={1.6} /><h3 className="mt-16 text-2xl font-bold tracking-[-.04em]">Escuta sem placar</h3><p className="mt-3 text-sm leading-relaxed text-[#f3eee4]/75">Sem ranking de bondade, sem números para provar presença. Só o tempo e a atenção que você escolheu oferecer.</p></article>
              <article className="rounded-[1.4rem] bg-[#c8c1d4] p-6 md:p-7"><LockKeyhole size={22} strokeWidth={1.6} /><h3 className="mt-16 text-2xl font-bold tracking-[-.04em]">Privacidade como base</h3><p className="mt-3 text-sm leading-relaxed text-[#183d3b]/70">Estamos começando pequeno para construir as regras com cuidado — antes de abrir espaço para muita gente.</p></article>
            </div>
          </div>
        </div>
      </section>

      <section id="entrar" className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-24 md:grid-cols-[.9fr_1.1fr] md:items-center md:gap-24 md:px-10 md:py-36">
        <div ref={formSection.ref} className={formSection.className}>
          <p className="eyebrow">o próximo passo</p>
          <h2 className="serif mt-4 text-5xl leading-[.93] md:text-7xl">Ajude a dar<br /><span className="text-[#d8785c]">forma ao lugar.</span></h2>
          <p className="mt-7 max-w-md text-[1.04rem] leading-[1.6] text-[#183d3b]/68">Estamos validando se essa vontade existe antes de construir qualquer coisa. Deixe seu e-mail e diga como você gostaria de participar.</p>
          <div className="mt-10 flex items-center gap-4 border-t border-[#183d3b]/15 pt-5 text-xs text-[#183d3b]/56"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#183d3b]/25"><Mail size={14} /></span> Seu endereço fica salvo apenas como demonstração local nesta versão.</div>
        </div>
        <SignupForm />
      </section>

      <section className="border-t border-[#183d3b]/15 bg-[#183d3b] px-5 py-16 text-[#f3eee4] md:px-10 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div><p className="eyebrow !text-[#d8785c]">uma nota importante</p><h2 className="serif mt-4 max-w-2xl text-4xl leading-[.98] md:text-6xl">Refúgio é apoio entre pessoas.<br /><span className="text-[#b7cfc0]">Não é terapia.</span></h2></div>
          <p className="max-w-xs text-sm leading-[1.65] text-[#f3eee4]/62">Em uma situação de risco imediato, procure o SAMU (192) ou o CVV pelo 188. Você merece ajuda profissional e urgente quando precisar.</p>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 text-xs text-[#183d3b]/55 md:flex-row md:items-center md:justify-between md:px-10">
        <Mark />
        <div className="flex flex-wrap gap-x-6 gap-y-2"><a href="#como-funciona" className="nav-link !text-xs" data-testid="footer-link-how">como funciona</a><a href="#entrar" className="nav-link !text-xs" data-testid="footer-link-join">entrar na lista</a><span>© 2025 Refúgio, ideia provisória</span></div>
      </footer>
    </main>
  );
}

function App() {
  return <Home />;
}

export default App;
