import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowDownRight, Check, ChevronDown, LockKeyhole, Mail, Menu, X } from 'lucide-react';
import { getWaitlistCount } from '@workspace/api-client-react';
import backgroundOne from '@assets/__(1)_1788457940406.jpeg';
import backgroundTwo from '@assets/__(2)_1788457940406.jpeg';
import backgroundThree from '@assets/__(3)_1788457940407.jpeg';
import backgroundFour from '@assets/__(4)_1788457940407.jpeg';
import backgroundFive from '@assets/__(5)_1788457940407.jpeg';
import backgroundSix from '@assets/50_shades_of_green_1788457954054.jpeg';
import eagleLogo from '@assets/refugio-eagle-logo.png';
import howItWorksOne from '@assets/__(1)_1788459710224.jpeg';
import howItWorksTwo from '@assets/__(2)_1788459710226.jpeg';
import howItWorksThree from '@assets/__(3)_1788459710226.jpeg';

/* -------------------------------------------------------------------------
 * Refúgio: landing (uma única página) + rota /admin.
 * Paleta fechada em 3 cores + 1 cinza de suporte:
 *   branco  #ffffff   → fundo principal
 *   preto   #02110c   → texto principal, seções de quebra
 *   tiber   #06392f   → botões, títulos-acento, cards de contraste
 *   cinza   #a4a9a5   → apenas bordas, legendas, texto muito secundário
 * ------------------------------------------------------------------------- */

type Intent = 'desabafar' | 'ajudar' | 'os-dois';
type FirstIntent = 'desabafar-especifico' | 'ouvir-primeiro' | 'entender-antes' | '';

const firstIntentOptions: { value: Exclude<FirstIntent, ''>; title: string; copy: string }[] = [
  { value: 'desabafar-especifico', title: 'Desabafar algo específico', copy: 'Tenho uma coisa em mente que preciso colocar pra fora.' },
  { value: 'ouvir-primeiro', title: 'Ouvir gente parecida comigo', copy: 'Quero ler o que outros escrevem antes de escrever qualquer coisa.' },
  { value: 'entender-antes', title: 'Entender como funciona', copy: 'Só quero ver como é, sem compromisso, antes de decidir.' },
];

const firstIntentLabels: Record<Exclude<FirstIntent, ''>, string> = {
  'desabafar-especifico': 'Desabafar algo específico',
  'ouvir-primeiro': 'Ouvir gente parecida comigo',
  'entender-antes': 'Entender como funciona',
};

const API_ENDPOINT = import.meta.env.VITE_REFUGIO_FORM_ENDPOINT ?? '/api/waitlist';

function getRef() {
  try {
    return new URLSearchParams(window.location.search).get('ref')?.trim().slice(0, 120) ?? '';
  } catch {
    return '';
  }
}

/* ------------------------- micro-componentes ------------------------- */

function Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" data-testid="brand-refugio">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ${inverse ? '' : 'bg-[#06392f]'}`}>
        <img src={eagleLogo} alt="" className="h-6 w-6 object-contain" />
      </span>
      <span className={`text-[1.02rem] font-bold tracking-[-.04em] ${inverse ? 'text-white' : 'text-[#02110c]'}`}>refúgio</span>
    </div>
  );
}

function Eyebrow({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <span className={`inline-block text-[.68rem] font-bold uppercase tracking-[.22em] ${inverse ? 'text-[#a4a9a5]' : 'text-[#06392f]'}`}>
      {children}
    </span>
  );
}

function ButtonPrimary({ children, onClick, type = 'button', disabled = false, testId, className = '' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; testId?: string; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#06392f] px-5 py-3 text-[.82rem] font-semibold text-white transition-colors hover:bg-[#02110c] disabled:cursor-wait disabled:opacity-70 md:px-6 md:py-3.5 md:text-[.92rem] ${className}`}
    >
      {children}
    </button>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity .7s ease, transform .7s ease' } as React.CSSProperties };
}

/* ------------------------- formulário principal ------------------------- */

function SignupForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState(() => { try { return sessionStorage.getItem('refugio-pending-email') ?? ''; } catch { return ''; } });
  const [intent, setIntent] = useState<Intent | ''>('');
  const [firstIntent, setFirstIntent] = useState<FirstIntent>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fill = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (typeof next === 'string') setEmail(next);
    };
    window.addEventListener('refugio-fill-email', fill);
    return () => window.removeEventListener('refugio-fill-email', fill);
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError('Confira o e-mail. Precisamos de um endereço válido.'); return; }
    if (!intent) { setError('Escolha como você quer chegar aqui.'); return; }
    setError(''); setSubmitting(true);
    try {
      const website = (e.currentTarget.elements.namedItem('website') as HTMLInputElement)?.value ?? '';
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, intencao: intent, primeira_intencao: firstIntent, ref: getRef(), website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível salvar agora. Tente de novo.');
      try { sessionStorage.removeItem('refugio-pending-email'); } catch {}
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar agora. Tente de novo.');
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-[#06392f] p-8 text-white md:p-10" data-testid="status-signup-success">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#06392f]"><Check size={20} /></div>
        <Eyebrow inverse>seu lugar está guardado</Eyebrow>
        <h3 className="serif mt-3 text-4xl leading-[.98]">Você está na lista.</h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">A gente te avisa quando o Refúgio abrir. Enquanto isso, ninguém recebe mensagem automática nem propaganda.</p>
      </div>
    );
  }

  const options: { intent: Intent; title: string; copy: string }[] = [
    { intent: 'desabafar', title: 'Quero desabafar', copy: 'Tenho algo para tirar do peito.' },
    { intent: 'ajudar', title: 'Quero acolher', copy: 'Quero ouvir e responder quem precisa.' },
    { intent: 'os-dois', title: 'Os dois', copy: 'Depende do dia, das duas coisas.' },
  ];

  return (
    <form onSubmit={submit} noValidate className={`rounded-3xl border border-[#a4a9a5]/60 bg-white ${compact ? 'p-6' : 'p-7 md:p-9'}`} data-testid="form-waitlist">
      {!compact && (
        <div className="mb-7">
          <Eyebrow>entre na lista de espera</Eyebrow>
          <h3 className="serif mt-2 text-3xl leading-[1.02] text-[#02110c]">Deixe seu e-mail. A gente te avisa quando abrir.</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#02110c]/75">Sem promessa vazia, sem newsletter. Uma mensagem só, quando o Refúgio estiver de pé.</p>
        </div>
      )}

      <label htmlFor="refugio-email" className="text-xs font-bold text-[#02110c]">Seu melhor e-mail</label>
      <div className="relative mt-2">
        <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a4a9a5]" />
        <input
          id="refugio-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="voce@exemplo.com"
          className="w-full rounded-full border border-[#a4a9a5]/70 bg-white py-3.5 pl-11 pr-5 text-sm text-[#02110c] outline-none placeholder:text-[#a4a9a5] focus:border-[#06392f]"
          data-testid="input-email"
        />
      </div>
      <p className="mt-2 text-[.7rem] text-[#a4a9a5]">Usamos só para te avisar. Nada de spam.</p>

      <fieldset className="mt-7">
        <legend className="mb-3 text-xs font-bold text-[#02110c]">Como você quer chegar aqui?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map(({ intent: v, title, copy }) => {
            const active = intent === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => { setIntent(v); setError(''); }}
                aria-pressed={active}
                data-testid={`button-intent-${v}`}
                className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${active ? 'border-[#06392f] bg-[#06392f] text-white' : 'border-[#a4a9a5]/70 bg-white text-[#02110c] hover:border-[#06392f]'}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[.98rem] font-bold tracking-[-.02em]">{title}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-white bg-white text-[#06392f]' : 'border-[#a4a9a5]'}`}>{active && <Check size={12} strokeWidth={3} />}</span>
                </span>
                <span className={`mt-6 block text-[.78rem] leading-[1.45] ${active ? 'text-white/85' : 'text-[#02110c]/70'}`}>{copy}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="mb-3">
          <Eyebrow>Opcional</Eyebrow>
          <span className="mt-2 block text-xs font-bold text-[#02110c]">O que faria você usar o Refúgio primeiro?</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {firstIntentOptions.map(({ value, title, copy }) => {
            const active = firstIntent === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setFirstIntent(active ? '' : value); setError(''); }}
                aria-pressed={active}
                data-testid={`button-first-intent-${value}`}
                className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${active ? 'border-[#06392f] bg-[#06392f] text-white' : 'border-[#a4a9a5]/70 bg-white text-[#02110c] hover:border-[#06392f]'}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[.98rem] font-bold tracking-[-.02em]">{title}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-white bg-white text-[#06392f]' : 'border-[#a4a9a5]'}`}>{active && <Check size={12} strokeWidth={3} />}</span>
                </span>
                <span className={`mt-6 block text-[.78rem] leading-[1.45] ${active ? 'text-white/85' : 'text-[#02110c]/70'}`}>{copy}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0" />

      {error && <p role="alert" className="mt-4 text-xs font-semibold text-[#06392f]" data-testid="status-signup-error">{error}</p>}

       <div className="mt-7 lg:flex lg:justify-center">
        <ButtonPrimary type="submit" disabled={submitting} testId="button-submit-signup" className="w-full whitespace-nowrap text-[.74rem] md:w-auto md:text-[.92rem]">
          {submitting ? 'Guardando seu lugar…' : 'Quero entrar na lista de espera'} {!submitting && <ArrowRight size={16} />}
        </ButtonPrimary>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[.7rem] text-[#02110c]/60"><LockKeyhole size={12} className="shrink-0" /><span>Grátis e anônimo. Você entra se quiser. E sai quando quiser.</span></p>
    </form>
  );
}

function CompactBar({ className = 'mt-8' }: { className?: string } = {}) {
  const [email, setEmail] = useState('');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;
    try { sessionStorage.setItem('refugio-pending-email', clean); } catch {}
    window.dispatchEvent(new CustomEvent('refugio-fill-email', { detail: clean }));
    window.location.hash = 'entrar';
    setTimeout(() => document.getElementById('refugio-email')?.focus(), 200);
  };
  return (
    <form onSubmit={submit} className={`${className} flex w-full max-w-2xl flex-col gap-2 rounded-3xl border border-[#a4a9a5]/70 bg-white p-2 sm:flex-row sm:items-center sm:rounded-full`}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu melhor e-mail"
        className="min-w-0 w-full flex-1 rounded-full bg-transparent px-4 py-3 text-sm text-[#02110c] outline-none placeholder:text-[#a4a9a5]"
        aria-label="Seu melhor e-mail"
      />
      <ButtonPrimary type="submit" className="w-full shrink-0 sm:w-auto">Entrar na lista <ArrowRight size={16} /></ButtonPrimary>
    </form>
  );
}

/* ------------------------- FAQ ------------------------- */

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#a4a9a5]/50">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-6 py-6 text-left">
        <span className="text-lg font-bold text-[#02110c]">{q}</span>
        <ChevronDown size={20} className={`shrink-0 text-[#06392f] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="max-w-3xl pb-6 text-sm leading-[1.75] text-[#02110c]/78">{a}</div>}
    </div>
  );
}

type ConversationExample = {
  label: string;
  sender: string;
  senderTime: string;
  message: React.ReactNode;
  responderTime: string;
  response: React.ReactNode;
};

const conversationExamples: ConversationExample[] = [
  {
    label: 'Quando ninguém pergunta como você está',
    sender: 'um apelido qualquer',
    senderTime: 'sem foto · sem perfil · há 12 minutos',
    message: (
      <>
        <p>Faz meses que ninguém pergunta como eu estou de verdade. E eu não sei mais o que responder quando alguém pergunta. Achei que ia passar sozinho, mas não passou.</p>
        <p className="mt-4 text-[#02110c]/75">Não queria virar assunto na família. E cansei de dizer 'tô bem' quando não tô.</p>
      </>
    ),
    responderTime: 'respondeu · há 4 minutos',
    response: (
      <>
        <p>Eu passei quase um ano assim. A parte pior pra mim foi exatamente essa: não ter onde soltar sem virar preocupação. O que me ajudou foi separar dois lugares: um pra falar do dia (aqui era um deles), outro pra cuidar de longo prazo. Você tem alguém pra ajudar com o longo prazo?</p>
        <div className="mt-5 flex items-center gap-2 text-[.68rem] font-bold text-white/85"><Check size={14} /> resposta marcada como útil</div>
      </>
    ),
  },
  {
    label: 'Depois de uma perda',
    sender: 'outro apelido',
    senderTime: 'sem foto · sem perfil · há 20 minutos',
    message: (
      <p>Perdi minha avó há 3 meses e todo mundo já voltou pra vida normal. Eu não. Sinto que se eu ainda falar sobre isso, vão achar que eu não superei, que tô sendo demais. Só queria dizer isso em algum lugar.</p>
    ),
    responderTime: 'respondeu · há 6 minutos',
    response: (
      <>
        <p>Não tem prazo pra isso, sério. Perdi meu pai faz 4 anos e ainda tem semana que dói do nada. Não é 'não ter superado', é que a gente aprende a carregar diferente. Você pode falar disso aqui sempre que precisar.</p>
        <div className="mt-5 flex items-center gap-2 text-[.68rem] font-bold text-white/85"><Check size={14} /> resposta marcada como útil</div>
      </>
    ),
  },
  {
    label: 'Quando você tá cansado de fingir',
    sender: 'outro apelido',
    senderTime: 'sem foto · sem perfil · há 5 minutos',
    message: (
      <p>Tô cansado. Cansado de sorrir no trabalho, cansado de dizer que tá tudo bem no grupo da família, cansado de responder mensagem como se eu fosse feliz. Não sei mais o que é sentir de verdade e o que é personagem.</p>
    ),
    responderTime: 'respondeu · há 2 minutos',
    response: (
      <>
        <p>Isso é uma das coisas mais difíceis de nomear e você acabou de nomear. Fica com essa frase que você escreveu — 'não sei mais o que é sentir e o que é personagem'. Guarda. Não precisa resolver hoje. Só de ver escrito, já muda alguma coisa.</p>
        <div className="mt-5 flex items-center gap-2 text-[.68rem] font-bold text-white/85"><Check size={14} /> resposta marcada como útil</div>
      </>
    ),
  },
];

function ConversationShowcase() {
  const [activeConversation, setActiveConversation] = useState(0);
  const conversation = conversationExamples[activeConversation];

  return (
    <>
      <div className="mt-10 flex gap-2 overflow-x-auto pb-1 md:mt-12 md:justify-center" role="tablist" aria-label="Exemplos de conversa">
        {conversationExamples.map((example, index) => {
          const active = activeConversation === index;
          return (
            <button
              key={example.label}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="conversation-panel"
              onClick={() => setActiveConversation(index)}
              data-testid={`conversation-tab-${index + 1}`}
              className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-left text-[.76rem] font-semibold leading-tight transition-colors md:text-center ${active ? 'border-[#06392f] bg-[#06392f] text-white' : 'border-[#a4a9a5]/60 bg-transparent text-white/70 hover:border-white/80 hover:text-white'}`}
            >
              {example.label}
            </button>
          );
        })}
      </div>

      <div
        key={activeConversation}
        id="conversation-panel"
        role="tabpanel"
        aria-label={conversation.label}
        className="conversation-content grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start"
      >
        <div className="rounded-3xl bg-white p-6 text-[#02110c] md:p-7">
          <div className="flex items-center gap-3 border-b border-[#a4a9a5]/50 pb-3">
            <span className="h-9 w-9 rounded-full bg-[#06392f]" />
            <div>
              <p className="text-xs font-bold">{conversation.sender}</p>
              <p className="text-[.68rem] text-[#a4a9a5]">{conversation.senderTime}</p>
            </div>
          </div>
          <div className="mt-4 text-[.98rem] leading-relaxed">{conversation.message}</div>
        </div>

        <div className="hidden md:mt-24 md:block"><ArrowRight size={28} className="text-[#a4a9a5]" /></div>

        <div className="rounded-3xl bg-[#06392f] p-6 text-white md:mt-14 md:p-7">
          <div className="flex items-center gap-3 border-b border-white/25 pb-3">
            <span className="h-9 w-9 rounded-full bg-white" />
            <div>
              <p className="text-xs font-bold">outra pessoa, também anônima</p>
              <p className="text-[.68rem] text-white/70">{conversation.responderTime}</p>
            </div>
          </div>
          <div className="mt-4 text-[.98rem] leading-relaxed text-white/95">{conversation.response}</div>
        </div>
      </div>
    </>
  );
}

function WaitlistSocialProof() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void getWaitlistCount()
      .then(({ total: nextTotal }) => {
        if (mounted && Number.isFinite(nextTotal)) setTotal(Math.floor(nextTotal));
      })
      .catch(() => {
        // A private count endpoint must never affect the landing page.
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (total === null || total <= 50) return null;

  return (
    <section aria-label="Prova social" className="border-y border-[#a4a9a5]/50 bg-white px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-7xl text-center">
        <Eyebrow>gente esperando para falar</Eyebrow>
        <p className="serif mt-4 text-[clamp(2.6rem,6vw,5rem)] leading-[.94] text-[#06392f]">
          {total} pessoas já estão esperando.
        </p>
      </div>
    </section>
  );
}

/* ------------------------- HOME ------------------------- */

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const espelho = useReveal();
  const virada = useReveal();
  const como = useReveal();
  const encontra = useReveal();
  const origem = useReveal();

  useEffect(() => { document.title = 'Refúgio — desabafe sem revelar quem você é'; }, []);

  return (
    <main className="min-h-screen bg-white text-[#02110c] antialiased">
      {/* NAV */}
      <header className="w-full border-b border-white/20 bg-[#032a24]/95 text-white shadow-[0_10px_30px_rgba(2,17,12,.18)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 md:px-10 md:py-8">
        <a href="#top" aria-label="Início"><Mark inverse /></a>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          <a href="#como-funciona" className="text-sm font-semibold text-white/85 hover:text-white">Como funciona</a>
          <a href="#por-que" className="text-sm font-semibold text-white/85 hover:text-white">Por que existe</a>
          <a href="#entrar" className="inline-flex items-center gap-1.5 rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-[#02110c]">Quero entrar <ArrowDownRight size={14} /></a>
        </nav>
        <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} className="rounded-full p-2 text-white lg:hidden">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        </div>
      </header>
      {menuOpen && (
        <nav className="mx-5 rounded-2xl border border-[#a4a9a5]/60 bg-white p-4 lg:hidden">
          <a href="#como-funciona" onClick={() => setMenuOpen(false)} className="block border-b border-[#a4a9a5]/40 py-3 text-sm font-semibold">Como funciona</a>
          <a href="#por-que" onClick={() => setMenuOpen(false)} className="block border-b border-[#a4a9a5]/40 py-3 text-sm font-semibold">Por que existe</a>
          <a href="#entrar" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-semibold text-[#06392f]">Quero entrar</a>
        </nav>
      )}

      {/* 01 PROMESSA — hero */}
      <section id="top" className="mx-auto w-full max-w-7xl px-5 pb-12 pt-5 md:px-10 md:pb-20 md:pt-10 lg:max-w-3xl">
        <Eyebrow>para quem precisa falar e não tem com quem</Eyebrow>
        <h1 className="serif mt-5 max-w-4xl text-[clamp(2rem,4.4vw,4.2rem)] font-normal leading-[1] text-[#02110c]">
          Tem um peso que você carrega porque não tem com quem falar. <span className="text-[#06392f]">Aqui, você fala. E ninguém sabe quem é você.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[1rem] leading-[1.55] text-[#02110c]/78 md:text-[1.08rem]">
          Um lugar anônimo para desabafar e ser ouvido por quem entende. Você fala do seu jeito, na hora que quiser. Sem seguidores, sem exposição e sem precisar fingir que está tudo bem.
        </p>
        <CompactBar className="mt-8 lg:mx-auto" />
      <p className="mt-3 max-w-2xl text-center text-[.72rem] leading-relaxed text-[#02110c]/60 lg:mx-auto">Grátis. Anônimo. A gente te avisa quando abrir.</p>
       <a href="#como-funciona" className="mt-3 block max-w-2xl text-left text-sm text-[#a4a9a5] underline-offset-4 transition-colors hover:text-[#06392f] hover:underline lg:mx-auto">
         Antes disso, quero ver como funciona ↓
       </a>
      </section>

      {/* 02 ESPELHO — narrativa em primeira pessoa, agita o problema */}
      <section className="bg-[#02110c] px-5 py-20 text-white md:px-10 md:py-32">
        <div ref={espelho.ref} style={espelho.style} className="mx-auto max-w-7xl lg:max-w-3xl">
          <Eyebrow inverse>o que segura a sua voz</Eyebrow>
          <h2 className="serif mt-4 max-w-4xl text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94]">
            Com quem você fala <span className="text-[#a4a9a5]">quando não dá pra falar com ninguém?</span>
          </h2>
          <p className="mt-10 max-w-4xl text-[1.06rem] leading-[1.75] text-white/85">
            Com a família, vira preocupação. Com os amigos mais próximos, vem o medo de ser lido diferente depois. Com colega, chefe, terapeuta esperando três semanas. Nada disso serve pro que você está sentindo agora, dentro do carro parado, ou às três da manhã com o celular na mão. Então você engole. Abre a caixa de mensagem de alguém, digita, apaga. Escreve nos rascunhos e nunca envia. Fecha o app. E carrega mais um dia.
          </p>
          <blockquote className="mt-14 max-w-3xl border-l-2 border-[#a4a9a5]/60 pl-5 md:pl-8">
            <p className="serif text-lg leading-[1.3] text-white md:text-2xl">
              “O problema quase nunca é falta de gente por perto. É que fica difícil ser honesto com quem sabe o seu nome, o seu rosto, a sua vida.”
            </p>
          </blockquote>
        </div>
      </section>

      {/* 03 VIRADA + MECANISMO — anonimato como liberdade */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-32">
        <div ref={virada.ref} style={virada.style} className="mx-auto max-w-3xl">
          <Eyebrow>a virada</Eyebrow>
          <h2 className="serif mt-4 text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94] text-[#02110c]">
            E se você pudesse falar sem que <span className="text-[#06392f]">ninguém</span> soubesse quem você é?
          </h2>
          <p className="mt-10 text-[1.06rem] leading-[1.75] text-[#02110c]/80">
            Aqui você decide como aparecer. Pode ser um apelido, um nome, uma foto qualquer, ou nada disso. Não tem perfil público, não tem seguidores, não tem gente te procurando.
          </p>
          <p className="serif mt-8 border-l-2 border-[#06392f] pl-5 text-xl leading-[1.25] text-[#06392f] md:pl-6 md:text-2xl">
            O anonimato não é para se esconder. É o que devolve a liberdade de falar.
          </p>
          <p className="mt-8 text-[1.06rem] leading-[1.75] text-[#02110c]/80">
            Do outro lado, alguém lê e responde, muitas vezes alguém que já passou por isso e sabe, na pele, como é precisar de apoio. A gente sabe que isso não é terapia, e não vai fingir que é. Mas ninguém devia ter que segurar tudo sozinho até a próxima consulta.
          </p>
        </div>
      </section>

      {/* 04 PROVA AO VIVO — mockup de conversa (ilustrativo, sem depoimento fake) */}
      <section className="bg-[#02110c] px-5 py-20 text-white md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="lg:text-center">
            <Eyebrow inverse>como uma conversa parece por dentro</Eyebrow>
            <h2 className="serif mt-4 max-w-3xl text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94] lg:mx-auto">
              Quem responde aqui é gente. Alguém que já sentou onde você está sentado agora.
            </h2>
            <p className="mt-6 max-w-2xl text-[1rem] leading-[1.7] text-white/75 lg:mx-auto">
               Um exemplo de como uma conversa costuma acontecer aqui. Nomes e situação são inventados — o Refúgio ainda não abriu.
            </p>
          </div>

          <ConversationShowcase />

          <CompactBar className="mt-14 lg:mx-auto" />
           <p className="mt-3 max-w-2xl text-center text-[.72rem] leading-relaxed text-white/70 lg:mx-auto">Grátis. Anônimo. A gente te avisa quando abrir.</p>
        </div>
      </section>

      {/* 05 COMO FUNCIONA — 3 passos */}
      <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-32">
        <div ref={como.ref} style={como.style}>
          <div className="lg:text-center">
            <Eyebrow>como funciona</Eyebrow>
            <h2 className="serif mt-4 max-w-2xl text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94] text-[#02110c] lg:mx-auto">É simples — de propósito.</h2>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
            {[
              ['01', 'Você escolhe como aparecer.', 'Um nome, um apelido, uma foto que faça sentido pra você, ou nada disso. Não tem perfil público, não tem seguidores, não tem gente te procurando pelo nome. Você decide o quanto quer mostrar.', howItWorksOne],
              ['02', 'Escreve o que está sentindo.', 'Do jeito que sair. Sem precisar organizar, sem precisar explicar de onde veio.', howItWorksTwo],
              ['03', 'Alguém lê e responde.', 'Uma pessoa comum que talvez já tenha passado por algo parecido. Você decide o que faz sentido levar.', howItWorksThree],
            ].map(([n, title, copy, background]) => (
              <article
                key={n}
                style={{ backgroundImage: `url("${background}")` }}
                className="group relative isolate flex min-h-[280px] flex-col overflow-hidden rounded-[2rem] border border-white/35 bg-[#06392f]/30 p-7 text-white shadow-[0_18px_45px_rgba(2,17,12,.14),inset_0_1px_0_rgba(255,255,255,.42)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 md:min-h-[330px] md:p-8"
              >
                <div className="absolute inset-0 -z-20 bg-[#02110c]/35" aria-hidden="true" />
                <div className="absolute -right-12 -top-14 -z-10 h-40 w-40 rounded-full bg-white/15 blur-3xl transition-opacity duration-300 group-hover:opacity-80" aria-hidden="true" />
                <div className="absolute -bottom-20 -left-14 -z-10 h-44 w-44 rounded-full bg-[#9de1c8]/15 blur-3xl" aria-hidden="true" />
                <div className="relative z-10 flex h-full flex-col">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-white/15 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45)] backdrop-blur-md">{n}</span>
                  <h3 className="mt-10 text-xl font-bold tracking-[-.02em] text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-[1.7] text-white/82">{copy}</p>
                </div>
              </article>
            ))}
          </div>
           <p className="mt-8 max-w-2xl text-center text-sm leading-[1.7] text-[#02110c]/75 lg:mx-auto">
            Sem anúncio, sem algoritmo te empurrando pro próximo post. Um lugar calmo pra sair da correria por alguns minutos.
          </p>
        </div>
      </section>

      {/* 06 O QUE VEM JUNTO — features concretas */}
      <section id="por-que" className="bg-[#02110c] px-5 py-20 text-white md:px-10 md:py-32">
        <div ref={encontra.ref} style={encontra.style} className="mx-auto max-w-7xl">
          <div className="lg:text-center">
            <Eyebrow inverse>o que você encontra aqui</Eyebrow>
            <h2 className="serif mt-4 max-w-3xl text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94] lg:mx-auto">
              Não é mais uma rede social. É <span className="text-[#a4a9a5]">quase o oposto dela.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-[1.02rem] leading-[1.7] text-white/78 lg:mx-auto">
              Nada de seguidores. Nada de curtidas públicas. Nada de anúncio entre um desabafo e outro. A ideia é o oposto de rede social: você entra pra falar ou pra escutar, não pra performar.
            </p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              ['100% anônimo.', 'Sem nome real, sem foto, sem perfil público. Você escolhe um apelido. Só isso aparece.', backgroundOne],
              ['Sem seguidores.', 'Ninguém está construindo audiência aqui. Todo mundo começa do zero, todo dia.', backgroundTwo],
              ['Pessoas que já passaram pelo mesmo.', 'Quem responde não é robô nem plantonista. É gente que sabe, pela própria vida, o que é precisar de apoio.', backgroundThree],
              ['Moderação de verdade.', 'Regras publicadas em uma página, sem letra miúda. Denúncia em um toque, e a equipe olha caso a caso. Quem passa do limite sai.', backgroundFour],
              ['Reputação por acolher, não por aparecer.', 'Quem contribui com respostas úteis ganha reconhecimento. O que vale é o que você oferece quando alguém precisa.', backgroundFive],
              ['Sem anúncio no meio do desabafo.', 'Projeto sem fins lucrativos. Ninguém está tentando te vender nada aqui.', backgroundSix],
            ].map(([title, copy, background]) => (
              <article
                key={title}
                style={{ backgroundImage: `url("${background}")` }}
                className="relative overflow-hidden rounded-2xl border border-white/20 bg-[#02110c] bg-cover bg-center p-6 md:p-7"
              >
                <div className="absolute inset-0 bg-[#02110c]/65" aria-hidden="true" />
                <div className="relative z-10">
                  <Check size={20} className="text-[#a4a9a5]" />
                  <h3 className="mt-8 text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/72">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 07 PROVA SOCIAL — contador factual da lista */}
      <WaitlistSocialProof />

      {/* 08 OFERTA — grátis + garantia = anonimato */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-32">
        <div className="text-center">
          <div className="mx-auto max-w-4xl">
            <Eyebrow>sem pegadinha</Eyebrow>
            <h2 className="serif mx-auto mt-4 text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94] text-[#02110c]">
              É de graça — e vai continuar sendo.
            </h2>
            <p className="mx-auto mt-6 max-w-[640px] text-[1.02rem] leading-[1.7] text-[#02110c]/75">
              A gente não quer que ninguém deixe de pedir ajuda por causa de dinheiro. Se um dia você quiser apoiar o projeto, vai ser opcional. E vai continuar sem anúncio no meio do desabafo.
            </p>
          </div>

          <div className="mx-auto mt-14 overflow-hidden rounded-3xl border border-[#a4a9a5]/60 bg-white text-left md:grid md:grid-cols-3">
            <div className="flex flex-col justify-center p-8 md:p-10">
              <p className="serif text-6xl text-[#06392f]">R$ 0</p>
              <p className="mt-2 text-[.98rem] text-[#02110c]/85">Grátis. E vai continuar sendo.</p>
            </div>

            <div className="border-t border-[#a4a9a5]/60 p-8 md:border-l md:border-t-0 md:p-10">
              <ul className="space-y-5 text-[.98rem] leading-[1.55] text-[#02110c]/85">
                <li className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-[#06392f]" /> Você entra sem nome real, sem cartão, sem cadastro pesado.</li>
                <li className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-[#06392f]" /> Ninguém, dentro ou fora daqui, vê quem é você.</li>
                <li className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-[#06392f]" /> Você pode apagar sua conta a qualquer momento. E leva junto tudo que escreveu.</li>
                <li className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-[#06392f]" /> Sem anúncios. Sem revenda de dados. Sem exceção.</li>
              </ul>
            </div>

            <div className="flex flex-col justify-between gap-8 bg-[#06392f] p-8 text-white md:p-10">
              <h3 className="serif text-3xl leading-[1.05]">A garantia é o anonimato.</h3>
              <p className="mt-4 text-[.98rem] leading-[1.7] text-white/85">
                Se um dia isso mudar, você é o primeiro a saber. E decide se continua ou não. Enquanto o Refúgio existir, o anonimato vem antes de qualquer outra coisa.
              </p>
            </div>
          </div>
          <CompactBar className="mx-auto mt-8" />
          <p className="mt-3 text-[.72rem] leading-relaxed text-[#a4a9a5]">Grátis. Anônimo. A gente te avisa quando abrir.</p>
        </div>
      </section>

      {/* 09 ÚLTIMA CHANCE + CTA final */}
      <section id="entrar" className="bg-[#02110c] px-5 py-20 text-white md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
           <div ref={origem.ref} style={origem.style} className="mx-auto max-w-3xl text-left lg:text-center">
            <Eyebrow inverse>a última coisa</Eyebrow>
             <h2 className="serif mt-4 text-[clamp(2rem,4.4vw,4.2rem)] leading-[.93] lg:mx-auto">
              Você não precisa segurar tudo <span className="text-[#a4a9a5]">sozinho.</span>
            </h2>
            <p className="mx-auto mt-7 max-w-2xl text-[1.05rem] leading-[1.7] text-white/78">
              A comunidade ainda não abriu. Quando abrir, você vai poder falar sem revelar quem é. E é você quem decide o quanto quer contar. Do outro lado, alguém estará pronto pra ouvir.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[.9rem] leading-[1.7] text-white/60">
              Se fizer sentido pra você, deixe seu e-mail. A gente te avisa quando abrir. E vai querer saber, sem pressão, o que você espera encontrar aqui.
            </p>
            <ul className="mt-7 space-y-4 text-left text-sm leading-[1.55] text-white">
              <li className="flex items-start gap-3"><Check size={15} className="mt-0.5 shrink-0 text-[#06392f]" /> <span>Anônimo de verdade. Sem nome real, sem foto, sem perfil público.</span></li>
              <li className="flex items-start gap-3"><Check size={15} className="mt-0.5 shrink-0 text-[#06392f]" /> <span>Grátis, sem anúncio no meio do desabafo, sem revenda de dados.</span></li>
              <li className="flex items-start gap-3"><Check size={15} className="mt-0.5 shrink-0 text-[#06392f]" /> <span>Comunidade real. Gente que já passou por algo parecido responde.</span></li>
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-white/70">
              A comunidade ainda não abriu. Quando abrir, você é dos primeiros a saber.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <SignupForm />
          </div>
        </div>
      </section>

      {/* 10 FAQ — objeções reais */}
      <section className="border-y border-[#a4a9a5]/50 bg-white px-5 py-20 md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
            <div className="text-center">
             <Eyebrow>as dúvidas que mais chegam</Eyebrow>
             <h2 className="serif mx-auto mt-4 max-w-3xl text-[clamp(2rem,4.4vw,4.2rem)] leading-[.94] text-[#02110c]">Antes de deixar o e-mail.</h2>
           </div>
          <div className="mt-12 border-t border-[#a4a9a5]/50">
            <FaqItem q="É mesmo anônimo?" a={<p>Sim. Você participa sem nome real, sem foto e sem perfil público. A comunidade vê só o apelido que você escolher. A gente também deixa sempre claro o mínimo que fica guardado no servidor.</p>} />
            <FaqItem q="Vocês são psicólogos ou terapeutas?" a={<p>Não. O Refúgio é uma comunidade de apoio entre pessoas. <strong>Não substitui atendimento psicológico, médico ou serviços de emergência.</strong> Se você estiver passando por um momento grave ou pensando em se machucar, ligue para o <strong className="text-[#06392f]">CVV no 188</strong> (24h, gratuito e sigiloso) ou procure a emergência no 192. Você não está sozinho.</p>} />
            <FaqItem q="E se alguém me tratar mal?" a={<p>Tem regras de convivência e moderação. Você pode denunciar qualquer conteúdo que passe do limite, e a equipe responsável cuida disso. Respeito aqui não é opcional.</p>} />
            <FaqItem q="É pago?" a={<p>Não. É gratuito e sem compromisso, porque a ideia é que ninguém deixe de pedir ajuda por causa de dinheiro. Se um dia você quiser apoiar o projeto, é escolha sua.</p>} />
            <FaqItem q="Vocês vão vender meus dados?" a={<p>Não. O projeto é sem fins lucrativos e não tem anúncio no meio do desabafo. A gente não vende, não compartilha e não usa o que você escreve pra treinar nada.</p>} />
            <FaqItem q="E se eu não souber o que escrever?" a={<p>Não precisa saber. Muita gente começa com uma frase só. "Não sei por onde começar" já é começar. Você pode voltar depois, editar, ou apagar. É seu.</p>} />
            <FaqItem q="Quanto tempo até alguém me responder?" a={<p>Depende. Como quem responde é gente comum (não plantonista, não robô), pode levar minutos ou algumas horas. A gente também mostra quantas pessoas estão online agora, pra você não ficar no escuro. Se o assunto for urgente de verdade, ligue para o CVV no 188.</p>} />
            <FaqItem q="E se eu me arrepender do que escrevi?" a={<p>Você pode apagar qualquer coisa que escreveu, a qualquer momento, e some pra todo mundo. Não fica em backup, não fica em cache visível pra outros usuários. E se quiser sumir de vez, apaga a conta inteira — leva junto tudo que já escreveu.</p>} />
            <FaqItem q="Como sei que quem responde não é uma pessoa ruim?" a={<p>Ninguém entra aqui como especialista. Todo mundo começa igual, sem seguidores, sem reputação. Quem contribui com respostas úteis vai ganhando reconhecimento com o tempo, e quem passa do limite é denunciado e sai. Você também pode bloquear qualquer pessoa a qualquer momento — sem precisar justificar.</p>} />
          </div>
          <div
            style={{ backgroundImage: `url("${backgroundSix}")` }}
            className="relative mt-8 overflow-hidden rounded-2xl border border-white/20 bg-[#02110c] bg-cover bg-center p-6 text-sm leading-relaxed text-white/80 md:mt-10 md:p-7"
          >
            <div className="absolute inset-0 bg-[#02110c]/70" aria-hidden="true" />
            <p className="relative z-10">
              <strong className="text-white">Este espaço não substitui atendimento profissional.</strong> Em um momento de crise, ligue para o CVV: <strong>188</strong> (24h, gratuito e sigiloso) · Emergência: <strong>192</strong>.
            </p>
          </div>
        </div>
      </section>

      <footer className="flex w-full flex-col gap-4 border-t border-white/10 bg-[#02110c] px-5 py-8 text-xs text-white/60 md:flex-row md:items-center md:justify-between md:px-10">
        <Mark inverse />
        <span>Refúgio · comunidade anônima, sem fins lucrativos</span>
        <a href="/admin" className="text-xs text-white/50 hover:text-white">painel de validação</a>
      </footer>
    </main>
  );
}

/* ------------------------- ADMIN ------------------------- */

type AdminEntry = { email: string; intent: Intent; firstIntent: FirstIntent; source: string | null; createdAt: string };
type AdminSummary = { total: number; counts: Record<Intent, number>; firstIntentCounts: Record<Exclude<FirstIntent, ''>, number> };

function Admin() {
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState('');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { document.title = 'Refúgio · Painel'; }, []);

  const load = async (secret = auth) => {
    setLoading(true); setError('');
    const headers = { Authorization: `Basic ${btoa(`admin:${secret}`)}` };
    try {
      const [s, e] = await Promise.all([
        fetch('/api/admin/summary', { headers }),
        fetch('/api/admin/waitlist', { headers }),
      ]);
      if (s.status === 401 || e.status === 401) throw new Error('Senha inválida ou ADMIN_PASSWORD não configurado.');
      if (!s.ok || !e.ok) throw new Error('Não foi possível carregar.');
      setSummary(await s.json());
      setEntries((await e.json()).entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar.');
    } finally { setLoading(false); }
  };

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim()) { setAuth(password); void load(password); }
  };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const r = await fetch('/api/admin/waitlist.csv', { headers: { Authorization: `Basic ${btoa(`admin:${auth}`)}` } });
      if (!r.ok) throw new Error('Falha ao baixar CSV.');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'refugio-waitlist.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao baixar CSV.');
    } finally { setDownloading(false); }
  };

  if (!auth || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12">
        <form onSubmit={signIn} className="w-full max-w-md rounded-3xl border border-[#a4a9a5]/60 bg-white p-8 md:p-10">
          <Mark />
          <Eyebrow>área reservada</Eyebrow>
          <h1 className="serif mt-4 text-5xl leading-none text-[#02110c]">Cadastros.</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#02110c]/75">Digite a senha de administrador para consultar os dados da validação.</p>
          <label htmlFor="admin-password" className="mt-7 block text-xs font-bold text-[#02110c]">Senha</label>
          <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-full border border-[#a4a9a5]/70 bg-white px-5 py-3 text-sm text-[#02110c] outline-none focus:border-[#06392f]" autoFocus />
          {error && <p role="alert" className="mt-3 text-xs font-semibold text-[#06392f]">{error}</p>}
          <div className="mt-6"><ButtonPrimary type="submit">Entrar <ArrowRight size={16} /></ButtonPrimary></div>
        </form>
      </main>
    );
  }

  const labels: Record<Intent, string> = { desabafar: 'Desabafar', ajudar: 'Acolher', 'os-dois': 'Os dois' };
  const firstIntentKeys = Object.keys(firstIntentLabels) as Exclude<FirstIntent, ''>[];
  const total = summary?.total ?? 0;
  const wantHelp = (summary?.counts.ajudar ?? 0) + (summary?.counts['os-dois'] ?? 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <main className="min-h-screen bg-white px-5 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Mark />
            <Eyebrow>painel de validação</Eyebrow>
            <h1 className="serif mt-4 text-5xl leading-none text-[#02110c] md:text-7xl">Lista de espera.</h1>
          </div>
          <ButtonPrimary onClick={downloadCsv} disabled={downloading}>{downloading ? 'Preparando…' : 'Baixar CSV'} <ArrowDownRight size={16} /></ButtonPrimary>
        </div>
        {loading ? (
          <p className="mt-16 text-sm">Carregando…</p>
        ) : (
          <>
            <div className="mt-12 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#02110c] p-6 text-white">
                <p className="text-[.65rem] font-bold uppercase tracking-[.22em] text-[#a4a9a5]">total</p>
                <p className="serif mt-4 text-5xl">{total}</p>
              </div>
              <div className="rounded-2xl bg-[#06392f] p-6 text-white">
                <p className="text-[.65rem] font-bold uppercase tracking-[.22em] text-white/70">querem acolher</p>
                <p className="serif mt-4 text-5xl">{pct(wantHelp)}%</p>
                <p className="mt-1 text-xs text-white/70">{wantHelp} de {total}</p>
              </div>
              {(['desabafar', 'ajudar', 'os-dois'] as Intent[]).slice(0, 2).map((k) => (
                <div key={k} className="rounded-2xl border border-[#a4a9a5]/60 bg-white p-6">
                  <p className="text-[.65rem] font-bold uppercase tracking-[.22em] text-[#06392f]">{labels[k]}</p>
                  <p className="serif mt-4 text-5xl text-[#02110c]">{pct(summary?.counts[k] ?? 0)}%</p>
                  <p className="mt-1 text-xs text-[#a4a9a5]">{summary?.counts[k] ?? 0} cadastro(s)</p>
                </div>
              ))}
              <div className="rounded-2xl border border-[#a4a9a5]/60 bg-white p-6">
                <p className="text-[.65rem] font-bold uppercase tracking-[.22em] text-[#06392f]">primeira intenção</p>
                <div className="mt-4 space-y-3">
                  {firstIntentKeys.map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-xs text-[#02110c]">
                      <span>{firstIntentLabels[k]}</span>
                      <span className="font-bold text-[#06392f]">{pct(summary?.firstIntentCounts?.[k] ?? 0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-[#a4a9a5]/60 bg-white">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-[#a4a9a5]/50 text-xs uppercase tracking-wider text-[#a4a9a5]">
                  <tr><th className="px-5 py-4">E-mail</th><th className="px-5 py-4">Intenção</th><th className="px-5 py-4">Primeira intenção</th><th className="px-5 py-4">Data</th><th className="px-5 py-4">Origem</th></tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={`${e.email}-${e.createdAt}`} className="border-b border-[#a4a9a5]/30 last:border-0">
                      <td className="px-5 py-4 text-[#02110c]">{e.email}</td>
                      <td className="px-5 py-4 text-[#02110c]">{labels[e.intent] || e.intent}</td>
                      <td className="px-5 py-4 text-[#02110c]">{e.firstIntent ? firstIntentLabels[e.firstIntent as Exclude<FirstIntent, ''>] || e.firstIntent : '—'}</td>
                      <td className="px-5 py-4 text-[#02110c]/75">{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-4 text-[#a4a9a5]">{e.source || 'direto'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entries.length === 0 && <p className="p-8 text-sm text-[#02110c]/60">Ainda não há cadastros.</p>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ------------------------- ROOT ------------------------- */

export default function App() {
  return window.location.pathname === '/admin' ? <Admin /> : <Home />;
}
