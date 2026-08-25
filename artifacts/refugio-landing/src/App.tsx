import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowRight, Check, ChevronDown, EyeOff, HeartHandshake, LockKeyhole, Mail, Menu, Quote, ShieldCheck, Sparkles, X } from 'lucide-react';

type Intent = 'desabafar' | 'ajudar' | 'os-dois';

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
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
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
    setSubmitting(true);
    try {
      const response = await fetch(FUTURE_FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, intencao: intent, website: (event.currentTarget.elements.namedItem('website') as HTMLInputElement)?.value ?? '' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível salvar agora. Tente novamente.');
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[390px] flex-col justify-between rounded-[1.5rem] bg-[#183d3b] p-6 text-[#f3eee4] md:p-8" data-testid="status-signup-success">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b7cfc0] text-[#183d3b]"><Check size={22} /></div>
        <div>
          <p className="eyebrow !text-[#d8785c]">você está no começo</p>
          <h3 className="serif mt-3 text-4xl leading-[.98]">Seu convite está reservado.</h3>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#f3eee4]/70">Quando abrirmos as primeiras vagas, você vai saber antes. Obrigado por ajudar a dar forma a um lugar mais honesto para conversar.</p>
        </div>
        <p className="text-xs text-[#f3eee4]/50">Nenhuma mensagem automática será enviada nesta fase.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.5rem] border border-[#183d3b]/20 bg-[#f3eee4]/80 p-5 md:p-7" data-testid="form-waitlist">
      <div className="mb-7">
        <p className="eyebrow">entre na lista de interesse</p>
        <h3 className="serif mt-2 text-3xl leading-[1.02]">Receba o convite quando o Refúgio abrir.</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#183d3b]/65">Se fizer sentido para você, deixe seu e-mail. Vamos avisar quando houver um primeiro espaço seguro para entrar — e ouvir o que você espera encontrar aqui.</p>
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
           <IntentOption intent="desabafar" title="Quero desabafar" copy="Tenho algo para colocar para fora." selected={intent === 'desabafar'} onSelect={(value) => { setIntent(value); setError(''); }} />
           <IntentOption intent="ajudar" title="Quero ajudar alguém" copy="Quero estar presente para alguém." selected={intent === 'ajudar'} onSelect={(value) => { setIntent(value); setError(''); }} />
           <IntentOption intent="os-dois" title="Os dois" copy="Quero alternar entre os dois lados." selected={intent === 'os-dois'} onSelect={(value) => { setIntent(value); setError(''); }} />
        </div>
      </fieldset>
      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="honeypot" />
      {error && <p id="signup-error" role="alert" className="mt-4 text-xs font-semibold text-[#a7493c]" data-testid="status-signup-error">{error}</p>}
      <button type="submit" disabled={submitting} className="button-primary mt-7 w-full disabled:cursor-wait disabled:opacity-70" data-testid="button-submit-signup">{submitting ? 'Salvando seu convite...' : 'Quero entrar na lista de espera'} {!submitting && <ArrowRight size={16} />}</button>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[.68rem] leading-relaxed text-[#183d3b]/55"><LockKeyhole size={12} /> Grátis. Sem compromisso. Você será avisado quando a comunidade abrir.</p>
    </form>
  );
}

type AdminEntry = { email: string; intent: Intent; source: string | null; createdAt: string };
type AdminSummary = { total: number; counts: Record<Intent, number> };

function Admin() {
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState('');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async (secret = auth) => {
    setLoading(true);
    setError('');
    const headers = { Authorization: `Basic ${btoa(`admin:${secret}`)}` };
    try {
      const [summaryResponse, entriesResponse] = await Promise.all([
        fetch('/api/admin/summary', { headers }),
        fetch('/api/admin/waitlist', { headers }),
      ]);
      if (summaryResponse.status === 401 || entriesResponse.status === 401) throw new Error('Senha inválida ou ADMIN_PASSWORD ainda não configurado.');
      if (!summaryResponse.ok || !entriesResponse.ok) throw new Error('Não foi possível carregar os cadastros.');
      setSummary(await summaryResponse.json());
      setEntries((await entriesResponse.json()).entries);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os cadastros.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    if (password.trim()) {
      setAuth(password);
      void load(password);
    }
  };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/admin/waitlist.csv', { headers: { Authorization: `Basic ${btoa(`admin:${auth}`)}` } });
      if (!response.ok) throw new Error('Não foi possível baixar o CSV.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'refugio-waitlist.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Não foi possível baixar o CSV.');
    } finally {
      setDownloading(false);
    }
  };

  if (!auth || error) {
    return (
      <main className="refugio-page grain flex min-h-screen items-center justify-center px-5 py-12">
        <form onSubmit={signIn} className="w-full max-w-md rounded-[1.5rem] border border-[#183d3b]/20 bg-[#f3eee4] p-7 md:p-9">
          <Mark />
          <p className="eyebrow mt-12">área reservada</p>
          <h1 className="serif mt-3 text-5xl leading-none">Cadastros da lista.</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#183d3b]/65">Digite a senha de administrador para consultar os dados da validação.</p>
          <label className="mt-7 block text-xs font-bold" htmlFor="admin-password">Senha</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="email-field mt-2" autoFocus />
          {error && <p role="alert" className="mt-3 text-xs font-semibold text-[#a7493c]">{error}</p>}
          <button className="button-primary mt-6 w-full" type="submit">Entrar <ArrowRight size={16} /></button>
        </form>
      </main>
    );
  }

  const labels: Record<Intent, string> = { desabafar: 'Desabafar', ajudar: 'Ajudar', 'os-dois': 'Os dois' };
  return (
    <main className="refugio-page grain min-h-screen px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><Mark /><p className="eyebrow mt-10">painel de validação</p><h1 className="serif mt-3 text-5xl leading-none md:text-7xl">Lista de espera.</h1></div>
          <button className="button-primary" type="button" onClick={() => void downloadCsv()} disabled={downloading}>{downloading ? 'Preparando CSV...' : 'Baixar CSV'} {!downloading && <ArrowDownRight size={16} />}</button>
        </div>
        {loading ? <p className="mt-16 text-sm">Carregando cadastros...</p> : (
          <>
            <div className="mt-12 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#151515] p-5 text-[#f3eee4]"><p className="eyebrow !text-[#d8785c]">total</p><p className="serif mt-4 text-5xl">{summary?.total ?? 0}</p></div>
              {(['desabafar', 'ajudar', 'os-dois'] as Intent[]).map((item) => <div key={item} className="rounded-2xl bg-[#b7cfc0] p-5"><p className="text-xs font-bold">{labels[item]}</p><p className="serif mt-4 text-5xl">{summary?.total ? Math.round(((summary.counts[item] ?? 0) / summary.total) * 100) : 0}%</p><p className="mt-1 text-xs text-[#183d3b]/60">{summary?.counts[item] ?? 0} cadastro(s)</p></div>)}
            </div>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-[#183d3b]/15 bg-[#f3eee4]/80">
              <table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-[#183d3b]/15 text-xs uppercase tracking-wider text-[#183d3b]/55"><tr><th className="px-5 py-4">E-mail</th><th className="px-5 py-4">Intenção</th><th className="px-5 py-4">Data</th><th className="px-5 py-4">Origem</th></tr></thead><tbody>{entries.map((entry) => <tr key={`${entry.email}-${entry.createdAt}`} className="border-b border-[#183d3b]/10 last:border-0"><td className="px-5 py-4">{entry.email}</td><td className="px-5 py-4">{labels[entry.intent]}</td><td className="px-5 py-4">{new Date(entry.createdAt).toLocaleString('pt-BR')}</td><td className="px-5 py-4 text-[#183d3b]/60">{entry.source || 'direto'}</td></tr>)}</tbody></table>
              {entries.length === 0 && <p className="p-8 text-sm text-[#183d3b]/60">Ainda não há cadastros.</p>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const story = useReveal();
  const principles = useReveal();
  const formSection = useReveal();

  useEffect(() => {
    document.title = 'Refúgio — desabafe sem se expor e encontre quem escuta';
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
           <div className="reveal is-visible flex items-center gap-3" data-testid="text-hero-eyebrow"><span className="h-px w-9 bg-[#d8785c]" /><span className="eyebrow">para quem precisa falar e não tem com quem</span></div>
           <h1 className="serif reveal reveal-delay-1 is-visible mt-6 max-w-5xl text-[clamp(3.1rem,7.5vw,7rem)] leading-[.89] text-[#183d3b]" data-testid="text-hero-title">Tire o peso do peito hoje — <span className="text-[#d8785c]">sem que ninguém saiba quem você é.</span></h1>
           <p className="reveal reveal-delay-2 mt-8 max-w-2xl text-[1.06rem] leading-[1.55] text-[#183d3b]/72 md:mt-10 md:text-[1.2rem]">Uma comunidade anônima para desabafar e ser acolhido por pessoas que já passaram por algo parecido. <strong>Sem seguidores, sem exposição</strong>, sem precisar fingir que está tudo bem.</p>
          <div className="reveal reveal-delay-3 is-visible mt-9 flex flex-wrap items-center gap-6 md:mt-11">
            <a href="#entrar" className="button-primary" data-testid="button-hero-join">Quero entrar na lista de espera <ArrowDownRight size={16} /></a>
            <span className="max-w-[12rem] text-[.7rem] leading-relaxed text-[#183d3b]/55">Grátis. Sem compromisso. Avisaremos quando abrir.</span>
          </div>
        </div>
        <HeroArtwork />
      </section>

      <section className="border-y border-[#183d3b]/15 bg-[#151515] px-5 py-20 text-[#f3eee4] md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
           <p className="eyebrow !text-[#d8785c]">talvez você conheça essa sensação</p>
           <h2 className="serif mt-4 max-w-3xl text-5xl leading-[.94] md:text-7xl">Você já teve algo preso na garganta que não conseguiu falar com ninguém.</h2>
           <p className="mt-7 max-w-3xl text-[1.02rem] leading-[1.6] text-[#f3eee4]/70">Contar pra família ia virar preocupação, ou sermão. Pros amigos também não dava: e se vazasse, e se te olhassem diferente depois? Então você segurou. De novo. Abriu a conversa de alguém, digitou, apagou, e guardou pra você mais uma vez.</p>
          <div className="mt-12 grid gap-x-10 gap-y-5 md:grid-cols-2">
            {[
               'Não é que você não tenha ninguém.',
               'É que não consegue ser honesto com quem te conhece.',
               'Você não queria preocupar sua família.',
               'Tinha medo de ser julgado pelos seus amigos.',
               'Não queria que conhecidos soubessem da sua vida.',
               'E acabou guardando tudo para você.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border-b border-[#f3eee4]/12 pb-4 text-[1.02rem] text-[#f3eee4]/78">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8785c]" />{item}
              </div>
            ))}
          </div>
           <p className="serif mt-14 max-w-3xl text-3xl leading-[1.02] text-[#b7cfc0] md:text-5xl">O problema quase nunca é falta de gente por perto. É que fica difícil falar de verdade com quem sabe o seu nome, o seu rosto, a sua vida.</p>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto w-full max-w-7xl px-5 py-24 md:px-10 md:py-36">
        <div ref={story.ref} className={story.className}>
          <div className="grid gap-12 md:grid-cols-[.72fr_1.28fr] md:gap-24">
            <div>
               <p className="eyebrow">a virada</p>
               <h2 className="serif mt-4 max-w-md text-5xl leading-[.95] md:text-6xl">E se você pudesse falar sem que ninguém soubesse quem você é?</h2>
               <p className="mt-6 max-w-sm text-sm leading-[1.65] text-[#183d3b]/65">Você não tem nome real, não tem foto, não tem um perfil pra proteger. Sem plateia pra impressionar e sem ninguém pra te julgar depois, dá pra dizer o que você realmente sente — não a versão editada.</p>
            </div>
            <div className="grid gap-0 border-t border-[#183d3b]/20">
              {[
                 { number: '01', icon: EyeOff, title: 'Entre com um nome anônimo', copy: 'Nada seu aparece. Sem nome real, foto ou perfil para proteger.' },
                 { number: '02', icon: HeartHandshake, title: 'Escreva o que está sentindo', copy: 'Do jeito que sair. Sem editar para parecer bem, sem precisar explicar tudo.' },
                 { number: '03', icon: ShieldCheck, title: 'Pessoas reais leem e respondem', copy: 'Gente que talvez já tenha passado pelo mesmo acolhe e compartilha perspectivas. Você decide o que faz sentido levar.' },
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
              <div><p className="eyebrow">um lugar sem personagem</p><h2 className="serif mt-4 max-w-2xl text-5xl leading-[.94] md:text-7xl">Aqui, ninguém precisa<br /><span className="text-[#b85d47]">parecer forte.</span></h2></div>
              <p className="max-w-xs text-sm leading-[1.65] text-[#183d3b]/65">Você pode simplesmente ser uma pessoa passando por alguma coisa. Sem fingir que está tudo bem, sem transformar sua vulnerabilidade em uma apresentação.</p>
            </div>
            <div className="mt-16 grid gap-4 md:mt-24 md:grid-cols-3">
               <article className="rounded-[1.4rem] bg-[#b7cfc0] p-6 md:p-7"><EyeOff size={22} strokeWidth={1.6} /><h3 className="mt-16 text-2xl font-bold tracking-[-.04em]">100% anônimo.</h3><p className="mt-3 text-sm leading-relaxed text-[#183d3b]/70">Nome, foto e perfil ficam de fora. Você escolhe um apelido e é só isso que aparece.</p></article>
               <article className="rounded-[1.4rem] bg-[#d8785c] p-6 text-[#f3eee4] md:mt-12 md:p-7"><Quote size={22} strokeWidth={1.6} /><h3 className="mt-16 text-2xl font-bold tracking-[-.04em]">Pessoas que já passaram pelo mesmo.</h3><p className="mt-3 text-sm leading-relaxed text-[#f3eee4]/75">Não são robôs, nem profissionais. É gente de verdade, respondendo a partir da própria experiência.</p></article>
               <article className="rounded-[1.4rem] bg-[#c8c1d4] p-6 md:p-7"><LockKeyhole size={22} strokeWidth={1.6} /><h3 className="mt-16 text-2xl font-bold tracking-[-.04em]">Sem seguidores e sem competição.</h3><p className="mt-3 text-sm leading-relaxed text-[#183d3b]/70">Ninguém está construindo uma audiência. Todo mundo começa igual.</p></article>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#183d3b]/15 bg-[#151515] px-5 py-24 text-[#f3eee4] md:px-10 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.8fr_1.2fr] md:items-start md:gap-24">
          <div>
             <p className="eyebrow !text-[#d8785c]">uma comunidade, não um balcão</p>
             <h2 className="serif mt-4 text-5xl leading-[.94] md:text-7xl">Você ajuda.<br /><span className="text-[#b7cfc0]">Você também pode ser ajudado.</span></h2>
          </div>
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-lg leading-[1.45] text-[#f3eee4]/82">Hoje você pode estar entrando para pedir ajuda. Amanhã pode ser você dizendo para outra pessoa:</p>
              <p className="serif mt-5 text-3xl text-[#d8785c]">“Eu já passei por isso.”</p>
            </div>
            <div>
               <p className="text-sm leading-[1.7] text-[#f3eee4]/65">Quanto mais você contribui com respostas que a comunidade considera úteis, mais reconhecimento recebe. Aqui, reputação não vem de seguidores. Vem do que você oferece quando alguém precisa.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-[#151515]">
                <span className="rounded-full bg-[#b7cfc0] px-3 py-2">Pessoa que ajuda</span>
                <span className="rounded-full bg-[#c8c1d4] px-3 py-2">Boa ouvinte</span>
                <span className="rounded-full bg-[#d8785c] px-3 py-2 text-[#f3eee4]">Acolhedor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="entrar" className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-24 md:grid-cols-[.9fr_1.1fr] md:items-center md:gap-24 md:px-10 md:py-36">
        <div ref={formSection.ref} className={formSection.className}>
          <p className="eyebrow">o próximo passo</p>
          <h2 className="serif mt-4 text-5xl leading-[.93] md:text-7xl">Talvez você não precise ser forte<br /><span className="text-[#d8785c]">o tempo todo.</span></h2>
           <p className="mt-7 max-w-md text-[1.04rem] leading-[1.6] text-[#183d3b]/68">Quando a comunidade abrir, você vai ter um lugar para falar sem revelar quem é — e pessoas do outro lado prontas para ouvir. Deixe seu e-mail e a gente te avisa.</p>
           <div className="mt-10 flex items-center gap-4 border-t border-[#183d3b]/15 pt-5 text-xs text-[#183d3b]/56"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#183d3b]/25"><Mail size={14} /></span> Grátis. Anônimo. Sem fins lucrativos.</div>
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

function CopyStructureHome() {
  const conversation = useReveal();
  const benefits = useReveal();
  const origin = useReveal();

  useEffect(() => {
    document.title = 'Refúgio — desabafe sem precisar mostrar quem você é';
  }, []);

  return (
    <main className="refugio-page grain">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <a href="#top" className="nav-link" aria-label="Voltar ao início"><Mark /></a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          <a href="#como-funciona" className="nav-link">Como funciona</a>
          <a href="#o-que-encontra" className="nav-link">O que você encontra</a>
          <a href="#entrar" className="button-quiet">Entrar na lista <ArrowDownRight size={14} /></a>
        </nav>
      </header>

      <section id="top" className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.05fr_.95fr] md:items-center md:gap-16 md:px-10 md:pb-32 md:pt-16">
        <div className="max-w-2xl">
          <p className="eyebrow">para quem precisa falar e não tem com quem</p>
          <h1 className="serif mt-6 text-[clamp(3.1rem,7.5vw,7rem)] leading-[.89] text-[#183d3b]">Tire o peso do peito hoje — <span className="text-[#d8785c]">sem que ninguém saiba quem você é.</span></h1>
          <p className="mt-8 max-w-2xl text-[1.06rem] leading-[1.55] text-[#183d3b]/72 md:text-[1.2rem]">Uma comunidade anônima para desabafar e ser acolhido por pessoas que já passaram por algo parecido. <strong>Sem seguidores, sem exposição</strong>, sem precisar fingir que está tudo bem.</p>
          <div className="mt-9 flex flex-wrap items-center gap-6"><a href="#entrar" className="button-primary">Quero entrar na lista de espera <ArrowDownRight size={16} /></a><span className="max-w-[12rem] text-[.7rem] leading-relaxed text-[#183d3b]/55">Grátis. Anônimo. Sem compromisso.</span></div>
        </div>
        <HeroArtwork />
      </section>

      <section className="border-y border-[#183d3b]/15 bg-[#151515] px-5 py-20 text-[#f3eee4] md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow !text-[#d8785c]">o que talvez esteja travando você</p>
          <h2 className="serif mt-4 max-w-4xl text-5xl leading-[.94] md:text-7xl">Você já teve algo preso na garganta que não conseguiu falar com ninguém.</h2>
          <p className="mt-8 max-w-3xl text-[1.05rem] leading-[1.7] text-[#f3eee4]/72">Contar pra família ia virar preocupação, ou sermão. Pros amigos também não dava: e se vazasse, e se te olhassem diferente depois? Então você segurou. De novo. Abriu a conversa de alguém, digitou, apagou, e guardou pra você mais uma vez.</p>
          <div className="mt-10 max-w-2xl border-l-2 border-[#d8785c] bg-[#f3eee4]/[.06] px-6 py-5"><p className="serif text-2xl italic leading-[1.25] text-[#f3eee4] md:text-3xl">“Não é que eu não tenha ninguém. É que não consigo ser honesto com quem me conhece.”</p></div>
          <p className="serif mt-12 max-w-3xl text-3xl leading-[1.02] text-[#b7cfc0] md:text-5xl">O problema quase nunca é falta de gente por perto. É que fica difícil falar de verdade com quem sabe o seu nome, o seu rosto, a sua vida.</p>
        </div>
      </section>

      <section className="paper-crease px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center md:gap-24">
          <div><p className="eyebrow">a virada</p><h2 className="serif mt-4 max-w-2xl text-5xl leading-[.94] md:text-7xl">E se você pudesse falar sem que <span className="text-[#b85d47]">ninguém</span> soubesse quem você é?</h2></div>
          <div><p className="text-[1.05rem] leading-[1.7] text-[#183d3b]/70">Você não tem nome real, não tem foto, não tem um perfil pra proteger. Sem plateia pra impressionar e sem ninguém pra te julgar depois, dá pra dizer o que você realmente sente — não a versão editada.</p><p className="serif mt-8 text-3xl leading-tight text-[#b85d47] md:text-5xl">O anonimato não é pra você se esconder. É o que finalmente te deixa ser honesto.</p><p className="mt-8 text-[1.05rem] leading-[1.7] text-[#183d3b]/70">Do outro lado, pessoas reais — muitas que já passaram exatamente pelo que você está passando — leem e respondem. Não porque ganham seguidores com isso. Porque um dia também precisaram.</p></div>
        </div>
      </section>

      <section className="border-y border-[#183d3b]/15 bg-[#c8c1d4] px-5 py-24 md:px-10 md:py-32">
        <div ref={conversation.ref} className={`${conversation.className} mx-auto max-w-7xl`}>
          <div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:items-center md:gap-24">
            <div><p className="eyebrow">veja como é por dentro</p><h2 className="serif mt-4 text-5xl leading-[.94] md:text-7xl">Um lugar onde sua história encontra escuta.</h2><p className="mt-6 max-w-md text-sm leading-[1.7] text-[#183d3b]/70">Você escreve o que está sentindo. Pessoas reais leem, acolhem e compartilham o que aprenderam vivendo algo parecido.</p></div>
            <div className="relative rounded-[2rem] bg-[#f3eee4] p-6 shadow-[10px_10px_0_#183d3b] md:p-9">
              <div className="flex items-center gap-3 border-b border-[#183d3b]/15 pb-5"><span className="h-10 w-10 rounded-full bg-[#b7cfc0]" /><div><p className="text-xs font-bold">um nome anônimo</p><p className="text-[.68rem] text-[#183d3b]/50">sem foto · sem perfil · sem plateia</p></div><HeartHandshake className="ml-auto text-[#b85d47]" size={22} /></div>
              <p className="serif mt-7 text-2xl leading-tight md:text-3xl">“Eu precisava falar isso em algum lugar, mas não queria que ninguém conhecido soubesse.”</p>
              <div className="mt-7 ml-8 rounded-2xl bg-[#b7cfc0] p-5"><p className="text-sm leading-relaxed">Você não precisa ter as palavras certas. Às vezes, começar a falar já é uma forma de não carregar tudo sozinho.</p><div className="mt-4 flex items-center gap-2 text-[.68rem] font-bold text-[#183d3b]/55"><Check size={14} /> resposta considerada útil</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <p className="eyebrow">como funciona</p><h2 className="serif mt-4 max-w-2xl text-5xl leading-[.94] md:text-7xl">É mais simples do que parece.</h2>
        <div className="mt-12 grid gap-0 border-t border-[#183d3b]/20 md:grid-cols-3">
          {[
            ['01', 'Entre com um nome anônimo.', 'Nada seu aparece. Você escolhe um apelido e é só isso que a comunidade vê.'],
            ['02', 'Escreva o que está sentindo.', 'Do jeito que sair — sem editar para parecer bem, sem precisar explicar tudo.'],
            ['03', 'Pessoas reais leem e respondem.', 'Gente comum acolhe, compartilha perspectivas e oferece ideias. Você decide o que faz sentido.'],
          ].map(([number, title, copy]) => <div key={number} className="border-b border-[#183d3b]/20 py-7 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0"><span className="text-xs font-bold text-[#d8785c]">{number}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-[1.6] text-[#183d3b]/65">{copy}</p></div>)}
        </div>
      </section>

      <section id="o-que-encontra" className="border-y border-[#183d3b]/15 bg-[#151515] px-5 py-24 text-[#f3eee4] md:px-10 md:py-32">
        <div ref={benefits.ref} className={`${benefits.className} mx-auto max-w-7xl`}>
          <p className="eyebrow !text-[#d8785c]">o que você encontra aqui</p><h2 className="serif mt-4 max-w-3xl text-5xl leading-[.94] md:text-7xl">Um espaço para falar sem se explicar demais.</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              ['100% anônimo.', 'Nome, foto e perfil ficam de fora.'],
              ['Sem seguidores e sem competição.', 'Todo mundo começa igual.'],
              ['Pessoas que já passaram pelo mesmo.', 'Gente de verdade, não robôs nem profissionais.'],
              ['Reconhecimento para quem acolhe.', 'Você vale pelo que contribui, não por quem é.'],
              ['Um espaço moderado.', 'Regras claras para manter tudo seguro e respeitoso.'],
            ].map(([title, copy], index) => <article key={title} className={`rounded-[1.4rem] p-6 md:p-7 ${index % 3 === 0 ? 'bg-[#b7cfc0] text-[#183d3b]' : index % 3 === 1 ? 'bg-[#d8785c]' : 'bg-[#c8c1d4] text-[#183d3b]'}`}><Check size={21} /><h3 className="mt-12 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed opacity-75">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="paper-crease px-5 py-24 md:px-10 md:py-32">
        <div ref={origin.ref} className={`${origin.className} mx-auto grid max-w-7xl gap-10 md:grid-cols-[.7fr_1.3fr] md:gap-24`}><div><p className="eyebrow">por que isso está sendo criado</p><h2 className="serif mt-4 text-5xl leading-[.94] md:text-7xl">Começou com gente que não tinha pra quem contar.</h2></div><div className="max-w-2xl space-y-5 text-[1.05rem] leading-[1.7] text-[#183d3b]/70"><p>Todo dia chegam mensagens de pessoas querendo desabafar — gente sem ninguém pra quem contar, com medo de se expor na internet. São tantas que ficou impossível responder uma a uma.</p><p>Esta comunidade nasce disso: de um monte de gente precisando falar, e de outras dispostas a ouvir.</p><p>Estamos começando agora. Temos algo honesto: pessoas de verdade esperando por um lugar assim. Você pode ser uma delas.</p></div></div>
      </section>

      <section className="border-y border-[#183d3b]/15 bg-[#d8785c] px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center md:gap-24"><div><p className="eyebrow !text-[#f3eee4]">sem pegadinha</p><h2 className="serif mt-4 text-5xl leading-[.94] text-[#f3eee4] md:text-7xl">É de graça.<br />E a ideia é continuar sendo.</h2></div><div className="rounded-[1.5rem] bg-[#f3eee4] p-7 text-[#183d3b] md:p-9"><p className="serif text-4xl">R$ 0</p><p className="mt-5 text-sm leading-[1.7] text-[#183d3b]/70">Você não paga nada para entrar, para desabafar ou para ajudar. É um projeto <strong>sem fins lucrativos</strong>, sem anúncio no meio do seu desabafo.</p><p className="mt-5 text-sm leading-[1.7] text-[#183d3b]/70"><strong>Sua garantia é o anonimato:</strong> você entra sem nome real, sem cartão, sem cadastro pesado. E sai quando quiser.</p></div></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32"><p className="eyebrow">perguntas que talvez você esteja se fazendo</p><h2 className="serif mt-4 max-w-3xl text-5xl leading-[.94] md:text-7xl">Antes de entrar, talvez você queira saber.</h2><div className="mt-12 divide-y divide-[#183d3b]/20 border-y border-[#183d3b]/20">{[['É mesmo anônimo?', 'Para a comunidade, sim. Ninguém vê seu nome, rosto ou perfil — você escolhe um apelido e é só isso que aparece.'], ['Vocês são psicólogos ou terapeutas?', 'Não. Aqui você encontra pessoas, não profissionais de saúde mental. É escuta e apoio entre gente comum.'], ['E se alguém me tratar mal?', 'A comunidade sinaliza o que foge das regras e a moderação decide. Quem vem para machucar não fica.'], ['É pago?', 'Nenhuma pegadinha. É gratuito e sem fins lucrativos. Apoiar o projeto é opcional e nunca desbloqueia nada.']].map(([question, answer]) => <div key={question} className="grid gap-3 py-6 md:grid-cols-[.75fr_1.25fr] md:gap-10"><h3 className="text-lg font-bold">{question}</h3><p className="text-sm leading-[1.7] text-[#183d3b]/65">{answer}</p></div>)}</div></section>

      <section id="entrar" className="border-t border-[#183d3b]/15 bg-[#183d3b] px-5 py-24 text-[#f3eee4] md:px-10 md:py-32"><div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.85fr_1.15fr] md:items-center md:gap-24"><div><p className="eyebrow !text-[#d8785c]">a última coisa</p><h2 className="serif text-5xl leading-[.94] md:text-7xl">Talvez você não precise ser <span className="text-[#b7cfc0]">forte</span> o tempo todo.</h2><p className="mt-7 max-w-md text-[1.05rem] leading-[1.7] text-[#f3eee4]/70">Quando a comunidade abrir, você vai ter um lugar para falar sem revelar quem é — e pessoas do outro lado prontas para ouvir.</p></div><SignupForm /></div></section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 text-xs text-[#183d3b]/55 md:flex-row md:items-center md:justify-between md:px-10"><Mark /><span>Refúgio · comunidade anônima, sem fins lucrativos</span></footer>
    </main>
  );
}

function App() {
  return window.location.pathname === '/admin' ? <Admin /> : <CopyStructureHome />;
}

export default App;
