export const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";

export const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">';

const DARK = `--bg:#111110;--surface:#1a1918;--surface-2:#232220;--text:#f2f0eb;--muted:#a19d94;--border:#2c2a28;--track:#2a2826;--shadow:0 1px 2px rgb(0 0 0/.3),0 10px 30px rgb(0 0 0/.35);--al:70%;--as:78%;--on-accent:#111110;--code-bg:#262422;color-scheme:dark`;

export const CSS = `
:root{--bg:#faf9f6;--surface:#fff;--surface-2:#f3f1ec;--text:#1b1a18;--muted:#68645c;--border:#e6e3dc;--track:#e8e5de;--shadow:0 1px 2px rgb(30 25 15/.04),0 10px 30px rgb(30 25 15/.07);--al:47%;--as:72%;--on-accent:#fff;--code-bg:#f1efe9;--term-bg:#161514;--term-text:#efece5;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--bg);color:var(--text);font:16px/1.6 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
body.solo{overflow:auto}
button{font:inherit;color:inherit}
code,pre{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
code{font-size:.85em;background:var(--code-bg);padding:.12em .42em;border-radius:6px}
pre{margin:12px 0 0;background:var(--code-bg);border-radius:12px;padding:14px 16px;overflow-x:auto;font-size:.82rem;line-height:1.6}
pre code{background:none;padding:0;font-size:inherit}
:focus-visible{outline:2px solid hsl(var(--h,255) var(--as) var(--al));outline-offset:2px}

/* ── estrutura ── */
.deck{position:fixed;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.topbar{display:flex;align-items:center;gap:18px;padding:16px 24px;z-index:3}
.brand{font-weight:800;letter-spacing:-.01em;white-space:nowrap;max-width:20ch;overflow:hidden;text-overflow:ellipsis}
.segments{flex:1;display:flex;gap:5px;align-items:center;min-width:0;height:20px}
.seg{flex:var(--w) 1 0;min-width:6px;height:6px;border:0;padding:0;border-radius:99px;background:var(--track);cursor:pointer;overflow:hidden;position:relative;transition:height .2s}
.seg:hover,.seg.is-current{height:9px}
.seg>span{position:absolute;inset:0 auto 0 0;width:0;border-radius:inherit;background:hsl(var(--h) var(--as) var(--al));transition:width .5s cubic-bezier(.2,.7,.2,1)}
.icon-btn{flex:none;width:40px;height:40px;display:grid;place-items:center;border-radius:12px;border:1px solid var(--border);background:var(--surface);cursor:pointer;color:var(--muted);transition:color .2s,transform .2s}
.icon-btn:hover{color:var(--text);transform:translateY(-1px)}
.icon-btn svg{width:18px;height:18px}
.stage{position:relative;overflow:hidden}

/* ── slides ── */
.slide{--accent:hsl(var(--h) var(--as) var(--al));--accent-soft:hsl(var(--h) 85% 55% / .13);position:absolute;inset:0;display:flex;opacity:0;visibility:hidden;transform:translateX(56px);transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1),visibility .45s}
.slide.is-before{transform:translateX(-56px)}
.slide.is-active{opacity:1;visibility:visible;transform:none}
.slide::before,.slide::after{content:"";position:absolute;border-radius:50%;pointer-events:none}
.slide::before{width:72vmax;height:72vmax;right:-30vmax;top:-38vmax;background:radial-gradient(circle,hsl(var(--h) 90% 62% / .17),transparent 62%)}
.slide::after{width:50vmax;height:50vmax;left:-24vmax;bottom:-30vmax;background:radial-gradient(circle,hsl(calc(var(--h) + 50) 90% 62% / .10),transparent 62%)}
.slide-inner{position:relative;z-index:1;margin:auto;width:100%;max-width:1080px;max-height:100%;overflow-y:auto;padding:24px 40px 32px;scrollbar-width:thin;scrollbar-color:transparent transparent}
.slide-inner:hover{scrollbar-color:var(--border) transparent}
.slide-inner::-webkit-scrollbar{width:8px}.slide-inner::-webkit-scrollbar-thumb{background:transparent;border-radius:8px}.slide-inner:hover::-webkit-scrollbar-thumb{background:var(--border)}.slide-inner::-webkit-scrollbar-track{background:transparent}
.kicker{display:inline-flex;align-items:center;gap:10px;margin:0 0 16px;font-size:.76rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.kicker .num{display:grid;place-items:center;min-width:26px;height:26px;padding:0 6px;border-radius:9px;background:var(--accent-soft);letter-spacing:0;font-size:.8rem}
.title{font-size:clamp(2rem,1.2rem + 2.8vw,3.4rem);line-height:1.06;letter-spacing:-.035em;font-weight:800;margin:0 0 14px;max-width:20ch;text-wrap:balance}
.title .cont{font-size:.4em;font-weight:700;letter-spacing:0;color:var(--muted);vertical-align:middle;margin-left:6px}
.lede{font-size:clamp(1.05rem,.95rem + .5vw,1.3rem);color:var(--muted);max-width:58ch;margin:0 0 30px;text-wrap:pretty}
.statement{font-size:clamp(1.35rem,1rem + 1.4vw,2.1rem);line-height:1.32;font-weight:600;letter-spacing:-.02em;max-width:34ch;margin:0 0 32px;text-wrap:pretty}
.statement.small{font-size:clamp(1.15rem,.95rem + .9vw,1.6rem);max-width:40ch;margin:22px 0 0}
.mini-label,.label{display:block;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:0 0 10px}

/* entrada dos elementos */
.slide.is-active .reveal>*{animation:rise .6s cubic-bezier(.2,.7,.2,1) both}
.reveal>*:nth-child(2){animation-delay:.06s!important}.reveal>*:nth-child(3){animation-delay:.12s!important}.reveal>*:nth-child(4){animation-delay:.18s!important}.reveal>*:nth-child(5){animation-delay:.24s!important}.reveal>*:nth-child(6){animation-delay:.3s!important}.reveal>*:nth-child(7){animation-delay:.36s!important}.reveal>*:nth-child(8){animation-delay:.42s!important}
@keyframes rise{from{opacity:0;transform:translateY(16px)}}

/* ── blocos ── */
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))}
.grid-2{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.stack-list,.rules,.tasks,.modules,.quiz{display:grid;gap:14px}
.card{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;box-shadow:var(--shadow)}
.card h3{margin:0 0 6px;font-size:1.12rem;letter-spacing:-.015em;line-height:1.3}
.card p{margin:0;color:var(--muted)}
.card p.strong{color:var(--text);font-size:1.08rem;font-weight:600}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px}
.card-top h3{margin:0}
.badge{flex:none;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--accent-soft);color:var(--accent);white-space:nowrap}
.badge-strong{background:var(--accent);color:var(--on-accent)}
.big-card{padding:28px}
.big-card p{color:var(--text);font-size:1.12rem;line-height:1.55}
.emoji{display:block;font-size:1.9rem;line-height:1;margin-bottom:14px}
.evidence{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.ev{display:inline-flex;align-items:center;gap:6px;max-width:100%;font:500 .72rem/1.4 "JetBrains Mono",ui-monospace,monospace;padding:4px 9px;border-radius:8px;background:var(--surface-2);color:var(--muted);text-decoration:none;border:1px solid var(--border)}
.ev span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
a.ev:hover{color:var(--accent);border-color:var(--accent)}
.ev-lg{font-size:.92rem;padding:9px 14px;border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}

/* pessoas e jornadas */
.actor{display:flex;gap:16px;align-items:flex-start}
.avatar,.logo{flex:none;display:grid;place-items:center;font-weight:800;color:#fff;letter-spacing:-.02em}
.avatar{width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg,hsl(var(--ah) 72% 60%),hsl(calc(var(--ah) + 45) 72% 48%))}
.flow{margin-bottom:28px}
.flow h3{font-size:1.15rem;margin:0 0 14px}
.chain{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.chain li{display:flex;align-items:center;gap:10px}
.chain li:not(:last-child)::after{content:"→";color:var(--accent);font-weight:800;font-size:1.1rem}
.step{display:inline-flex;align-items:center;gap:10px;padding:10px 16px 10px 10px;border-radius:14px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);font-weight:600;font-size:.95rem;line-height:1.35}
.step b{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:8px;background:var(--accent);color:var(--on-accent);font-size:.8rem}

/* vocabulário */
.flips{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))}
.flip{perspective:1000px;border:0;padding:0;background:none;cursor:pointer;text-align:left;min-height:170px}
.flip-inner{position:relative;display:block;width:100%;height:100%;min-height:170px;transition:transform .7s cubic-bezier(.2,.7,.2,1);transform-style:preserve-3d}
.flip.is-flipped .flip-inner{transform:rotateY(180deg)}
.face{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;gap:10px;padding:20px;border-radius:20px;border:1px solid var(--border);box-shadow:var(--shadow);backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:auto}
.front{background:var(--surface)}
.front strong{font-size:1.3rem;letter-spacing:-.02em;line-height:1.2}
.front small{color:var(--muted);font-size:.76rem;font-weight:600}
.back{background:var(--accent);color:var(--on-accent);border-color:transparent;transform:rotateY(180deg);font-size:.95rem;line-height:1.5;justify-content:center}
.back code{background:rgb(255 255 255/.2);color:inherit}
.flip:hover .front{border-color:var(--accent)}
.quiz{gap:12px}
.quiz-q{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:16px 20px;box-shadow:var(--shadow)}
.quiz-q .q{font-weight:700;margin:0 0 10px;font-size:1.04rem}
.opts{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.opt{text-align:left;padding:12px 14px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface-2);cursor:pointer;line-height:1.4;font-size:.92rem;transition:border-color .2s,background .2s}
.opt:hover:not(:disabled){border-color:var(--accent)}
.opt:disabled{cursor:default}
.opt.is-right{border-color:hsl(150 60% 42%);background:hsl(150 60% 42% / .14)}
.opt.is-wrong{border-color:hsl(0 72% 56%);background:hsl(0 72% 56% / .12)}
.feedback{margin:0;font-weight:700;font-size:.92rem}
.feedback:not(:empty){margin-top:10px}
.score{font-weight:800;color:var(--accent);font-size:1.1rem;min-height:1.6em;margin:18px 0 0}

/* regras, stack, módulos */
.rule{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:start}
.rule-num{font-size:2.6rem;font-weight:800;letter-spacing:-.05em;line-height:1;color:var(--accent)}
.tech-head{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.tech-head strong{display:block;font-size:1.06rem;line-height:1.25}
.tech-head small{color:var(--muted);font-size:.78rem}
.logo{width:46px;height:46px;border-radius:14px;font-size:.95rem;background:linear-gradient(135deg,hsl(var(--th) 68% 56%),hsl(calc(var(--th) + 35) 68% 44%))}
.diagram{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:22px;box-shadow:var(--shadow);overflow:auto;max-height:58vh}
.diagram pre.mermaid{width:100%;background:none;padding:0;margin:0;font-family:inherit;text-align:center;white-space:pre-wrap}
.diagram svg{display:block;margin:0 auto;width:100%;height:auto;max-height:calc(58vh - 44px)}
.module{display:grid;grid-template-columns:minmax(0,260px) 1fr;gap:18px;align-items:center;padding:16px 20px;border-radius:16px;background:var(--surface);border:1px solid var(--border)}
.module strong{display:block;margin-bottom:4px}
.module code{background:var(--accent-soft);color:var(--accent);font-size:.78rem}
.module p{margin:0;color:var(--muted)}

/* mãos à obra */
.pills{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 26px;padding:0;list-style:none}
.pills li{padding:8px 16px;border-radius:99px;background:var(--surface);border:1px solid var(--border);font-weight:600;font-size:.92rem}
.pills li::before{content:"✓";color:var(--accent);margin-right:8px;font-weight:800}
.steps{list-style:none;counter-reset:s;padding:0;margin:0;display:grid;gap:10px}
.steps li{counter-increment:s;display:flex;gap:16px;align-items:center;padding:14px 18px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow)}
.steps li::before{content:counter(s);flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:.9rem}
.terminal{background:var(--term-bg);color:var(--term-text);border-radius:20px;padding:6px 6px 10px;box-shadow:var(--shadow);border:1px solid var(--border)}
.term-bar{display:flex;gap:7px;padding:10px 14px}
.term-bar i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.term-bar i:nth-child(2){background:#febc2e}.term-bar i:nth-child(3){background:#28c840}
.cmd{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:12px 16px;border-top:1px solid rgb(255 255 255/.07)}
.cmd code{background:none;color:inherit;font-size:.92rem;padding:0;word-break:break-all}
.cmd code::before{content:"$ ";color:hsl(var(--h) 75% 66%)}
.cmd p{margin:4px 0 0;color:rgb(255 255 255/.55);font-size:.86rem}
.cmd p code{background:rgb(255 255 255/.08);padding:.1em .4em}.cmd p code::before{content:none}
.copy{border:1px solid rgb(255 255 255/.16);background:transparent;color:inherit;border-radius:9px;padding:6px 12px;font-size:.78rem;font-weight:600;cursor:pointer}
.copy:hover{background:rgb(255 255 255/.08)}
.env code{font-size:.84rem;background:var(--accent-soft);color:var(--accent)}

/* tour */
.route{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px;counter-reset:r}
.route li{counter-increment:r;display:flex;align-items:center;gap:8px}
.route li::before{content:counter(r);display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--on-accent);font-size:.75rem;font-weight:800}
.route code{background:var(--surface);border:1px solid var(--border)}
.tour-step{display:grid;grid-template-columns:auto 1fr;gap:36px;align-items:start;margin-top:8px}
.bignum{font-size:clamp(5rem,3rem + 7vw,10rem);font-weight:800;line-height:.82;letter-spacing:-.06em;color:var(--accent);opacity:.22}
.stops{display:flex;gap:6px;margin-top:32px}
.stops i{width:28px;height:6px;border-radius:99px;background:var(--track);transition:background .3s}
.stops i.on{background:var(--accent)}

/* cuidados, decisões, missão */
.gotcha{display:grid;grid-template-columns:auto 1fr;gap:16px;border-left:4px solid var(--accent)}
.gotcha .emoji{margin:0}
.split{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));margin-top:14px}
.split p{color:var(--text)}
.task{display:flex;gap:16px;align-items:flex-start;padding:18px 20px;border-radius:18px;background:var(--surface);border:1px solid var(--border);cursor:pointer;box-shadow:var(--shadow);transition:opacity .25s,border-color .25s}
.task:hover{border-color:var(--accent)}
.task input{appearance:none;-webkit-appearance:none;flex:none;width:26px;height:26px;margin:1px 0 0;border-radius:9px;border:2px solid var(--border);display:grid;place-items:center;cursor:pointer;transition:background .2s,border-color .2s}
.task input:checked{background:var(--accent);border-color:var(--accent)}
.task input:checked::after{content:"✓";color:var(--on-accent);font-weight:800;font-size:.9rem}
.task strong{display:block;font-size:1.05rem}
.task-desc{display:block;color:var(--muted);margin-top:2px}
.task:has(input:checked){opacity:.6}
.task:has(input:checked) strong{text-decoration:line-through}

/* boas-vindas e final */
.welcome .hi{font-size:clamp(1.05rem,.95rem + .4vw,1.25rem);font-weight:700;color:var(--muted);margin:0 0 10px;display:flex;align-items:center;gap:10px}
.wave{display:inline-block;font-size:1.6em;transform-origin:70% 70%}
.slide.is-active .wave{animation:wave 2s ease-in-out .4s 1}
@keyframes wave{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(14deg)}20%,40%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}
.welcome .title{font-size:clamp(2.4rem,min(1.4rem + 4.6vw,9vh),5.2rem);max-width:16ch}
.welcome .lede{margin-bottom:24px}
.grad{background:linear-gradient(110deg,hsl(var(--h) 85% var(--al)),hsl(calc(var(--h) + 70) 85% var(--al)));-webkit-background-clip:text;background-clip:text;color:transparent}
.tagline{font-size:clamp(1.15rem,1rem + .7vw,1.5rem);font-weight:600;margin:0 0 14px;max-width:44ch;text-wrap:balance}
.cta{display:inline-flex;align-items:center;gap:10px;padding:15px 24px;border-radius:16px;border:0;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:1.02rem;cursor:pointer;box-shadow:0 10px 28px hsl(var(--h) 80% 50% / .35);transition:transform .2s,box-shadow .2s}
.cta:hover{transform:translateY(-2px);box-shadow:0 14px 34px hsl(var(--h) 80% 50% / .42)}
.cta .arrow{transition:transform .2s}.cta:hover .arrow{transform:translateX(3px)}
.journey{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.journey button{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:99px;background:var(--surface);border:1px solid var(--border);cursor:pointer;font-size:.86rem;font-weight:600;transition:border-color .2s,transform .2s}
.journey button:hover{border-color:hsl(var(--ch) var(--as) var(--al));transform:translateY(-1px)}
.journey .n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-size:.72rem;font-weight:800;background:hsl(var(--ch) 85% 55% / .15);color:hsl(var(--ch) var(--as) var(--al))}
.journey-wrap{margin-top:clamp(20px,4vh,44px)}
.meta{margin-top:20px}
.meta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-top:26px;color:var(--muted);font-size:.84rem}
.meta a{color:inherit}
.finale{text-align:center}
.finale .title,.finale .lede{margin-left:auto;margin-right:auto}
.party{display:block;font-size:clamp(3.5rem,2.5rem + 4vw,6rem);line-height:1;margin-bottom:16px}
.slide.is-active .party{animation:pop .8s cubic-bezier(.2,1.6,.4,1) both}
@keyframes pop{from{transform:scale(.3) rotate(-20deg);opacity:0}}
.recap{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;list-style:none;padding:0;margin:0 auto 22px;max-width:760px}
.recap li{padding:6px 14px;border-radius:99px;background:var(--surface);border:1px solid var(--border);font-size:.86rem;font-weight:600}
.recap li::before{content:"✓ ";color:hsl(var(--ch) var(--as) var(--al));font-weight:800}
.task-count{color:var(--muted);font-weight:600;margin:0 0 26px}
.actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.ghost{padding:15px 22px;border-radius:16px;border:1px solid var(--border);background:var(--surface);font-weight:700;cursor:pointer}
.ghost:hover{border-color:var(--accent)}

/* ── controles ── */
.controls{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:12px 24px 20px;z-index:3}
.controls [data-prev]{justify-self:start}
.controls [data-next]{justify-self:end}
.nav-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-weight:700;cursor:pointer;box-shadow:var(--shadow);transition:transform .2s,opacity .2s}
.nav-btn:hover:not(:disabled){transform:translateY(-1px)}
.nav-btn.primary{background:var(--text);color:var(--bg);border-color:var(--text)}
.nav-btn:disabled{opacity:0;visibility:hidden}
.where{display:flex;flex-direction:column;align-items:center;text-align:center;font-size:.8rem;color:var(--muted);line-height:1.4}
.where strong{color:var(--text);font-size:.9rem}
.hint.is-hidden{display:none}

/* índice */
.overview{position:fixed;inset:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow-y:auto;padding:28px 24px 56px;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,visibility .25s}
.overview.is-open{opacity:1;visibility:visible;pointer-events:auto}
.overview-inner{max-width:1040px;margin:0 auto}
.overview-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.overview-head h2{margin:0;font-size:1.6rem;letter-spacing:-.02em}
.ov-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr))}
.ov-chapter{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:16px;box-shadow:var(--shadow)}
.ov-chapter h3{display:flex;gap:10px;align-items:center;margin:0 0 8px;font-size:1rem}
.ov-chapter h3 .n{display:grid;place-items:center;width:26px;height:26px;border-radius:9px;font-size:.78rem;background:hsl(var(--ch) 85% 55% / .15);color:hsl(var(--ch) var(--as) var(--al))}
.ov-chapter button{display:block;width:100%;text-align:left;padding:7px 10px;border-radius:10px;border:0;background:none;cursor:pointer;color:var(--muted);font-size:.9rem;line-height:1.35}
.ov-chapter button:hover,.ov-chapter button.is-current{background:var(--surface-2);color:var(--text)}
.ov-chapter button.is-current{font-weight:700}

/* aviso de retomada */
.toast{position:fixed;left:50%;bottom:96px;z-index:15;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 32px);padding:12px 14px 12px 18px;border-radius:16px;background:var(--text);color:var(--bg);box-shadow:0 12px 40px rgb(0 0 0/.25);font-weight:600;font-size:.92rem;transform:translate(-50%,20px);opacity:0;visibility:hidden;transition:.35s cubic-bezier(.2,.7,.2,1)}
.toast.is-open{transform:translate(-50%,0);opacity:1;visibility:visible}
.toast button{border:0;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;background:rgb(127 127 127/.25);color:inherit}
.toast button.yes{background:var(--bg);color:var(--text)}

/* confete */
.confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:30}
.confetti i{position:absolute;top:-16px;width:9px;height:15px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{to{transform:translate3d(var(--dx),110vh,0) rotate(var(--r))}}

/* páginas de aviso */
.solo-wrap{min-height:100%;display:grid;place-items:center;padding:32px 16px;--h:255;--accent:hsl(var(--h) var(--as) var(--al));--accent-soft:hsl(var(--h) 85% 55% / .13)}
.solo-card{max-width:640px;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:36px;box-shadow:var(--shadow)}
.solo-card h1{font-size:clamp(1.6rem,1.2rem + 1.4vw,2.2rem);letter-spacing:-.03em;line-height:1.15;margin:0 0 12px}
.solo-card p{color:var(--muted);margin:0 0 20px}
.prompt{display:flex;gap:10px;align-items:flex-start}
.prompt pre{flex:1;white-space:pre-wrap;margin:0}
.prompt .copy{color:var(--text);border-color:var(--border)}

/* ── telas pequenas ── */
@media (max-width:760px){
  .topbar{padding:12px 16px;gap:10px}
  .brand{display:none}
  .slide-inner{padding:12px 16px 28px}
  .controls{padding:10px 16px 14px;gap:8px}
  .nav-btn{padding:11px 14px}
  .nav-btn .txt,.hint{display:none}
  .rule,.tour-step{grid-template-columns:1fr;gap:6px}
  .module{grid-template-columns:1fr;gap:6px}
  .bignum{font-size:4rem}
  .journey-wrap{margin-top:32px}
  .solo-card{padding:24px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

export const JS = `
(function(){
  var root=document.documentElement;
  var KEY='onboarding-kit:'+location.pathname+':';
  function sget(k){try{return localStorage.getItem(KEY+k)}catch(e){return null}}
  function sset(k,v){try{localStorage.setItem(KEY+k,v)}catch(e){}}
  function fill(t,o){return t.replace(/\\{(\\w+)\\}/g,function(_,k){return o[k]})}

  var theme=sget('theme'); if(theme) root.setAttribute('data-theme',theme);
  function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches}

  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var n=slides.length,cur=-1,celebrated=false;
  var segs=[].slice.call(document.querySelectorAll('.seg'));
  var $=function(id){return document.getElementById(id)};
  var prevBtn=document.querySelector('[data-prev]'),nextBtn=document.querySelector('[data-next]');
  var overview=$('ok-overview'),toast=$('ok-toast'),hint=$('ok-hint');

  function go(i){
    if(!n) return;
    i=Math.max(0,Math.min(n-1,i|0)); if(i===cur) return;
    slides.forEach(function(s,j){var on=j===i;s.classList.toggle('is-active',on);s.classList.toggle('is-before',j<i);s.setAttribute('aria-hidden',on?'false':'true');if('inert' in s)s.inert=!on});
    cur=i;
    var s=slides[i],inner=s.querySelector('.slide-inner'); if(inner) inner.scrollTop=0;
    segs.forEach(function(g){var st=+g.dataset.start,c=+g.dataset.count,p=i<st?0:i>=st+c?1:(i-st+1)/c;g.firstElementChild.style.width=(p*100)+'%';g.classList.toggle('is-current',i>=st&&i<st+c)});
    $('ok-chapter').textContent=s.dataset.chapterName;
    $('ok-count').textContent=(i+1)+' / '+n;
    prevBtn.disabled=i===0; nextBtn.disabled=i===n-1;
    [].forEach.call(document.querySelectorAll('.ov-chapter [data-go]'),function(b){b.classList.toggle('is-current',+b.dataset.go===i)});
    try{history.replaceState(null,'','#/'+(i+1))}catch(e){}
    sset('slide',String(i));
    if(s.dataset.kind==='finale'&&!celebrated){celebrated=true;confetti()}
  }
  function step(d){go(cur+d);if(hint)hint.classList.add('is-hidden');closeToast()}
  function openOverview(open){if(!overview)return;overview.classList.toggle('is-open',open);overview.setAttribute('aria-hidden',open?'false':'true');if(open){var c=overview.querySelector('.is-current')||overview.querySelector('button');c&&c.focus()}}
  function closeToast(){if(toast)toast.classList.remove('is-open')}

  document.addEventListener('click',function(e){
    var el=e.target.closest('button,[data-go]'); if(!el) return;
    if(el.hasAttribute('data-next')) return step(1);
    if(el.hasAttribute('data-prev')) return step(-1);
    if(el.hasAttribute('data-go')){openOverview(false);closeToast();return go(+el.dataset.go)}
    if(el.hasAttribute('data-overview')) return openOverview(true);
    if(el.hasAttribute('data-close')) return openOverview(false);
    if(el.hasAttribute('data-theme-toggle')){var nt=isDark()?'light':'dark';root.setAttribute('data-theme',nt);sset('theme',nt);return}
    if(el.hasAttribute('data-resume')){closeToast();return go(+el.dataset.resume)}
    if(el.hasAttribute('data-dismiss')) return closeToast();
    if(el.hasAttribute('data-copy')){
      var txt=el.dataset.copy,orig=el.textContent;
      if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){el.textContent=el.dataset.done||'✓';setTimeout(function(){el.textContent=orig},1600)});
      return;
    }
    if(el.classList.contains('flip')){var f=el.classList.toggle('is-flipped');el.setAttribute('aria-pressed',f?'true':'false');return}
    if(el.classList.contains('opt')){
      var q=el.closest('[data-quiz]'); if(!q||q.dataset.done) return;
      var right=el.dataset.correct==='1'; q.dataset.done=right?'right':'wrong';
      [].forEach.call(q.querySelectorAll('.opt'),function(o){o.disabled=true;if(o.dataset.correct==='1')o.classList.add('is-right')});
      if(!right) el.classList.add('is-wrong');
      q.querySelector('.feedback').textContent=right?q.dataset.right:q.dataset.wrong;
      var slide=q.closest('.slide'),all=slide.querySelectorAll('[data-quiz]'),done=slide.querySelectorAll('[data-quiz][data-done]'),ok=slide.querySelectorAll('[data-quiz][data-done="right"]');
      var score=slide.querySelector('[data-quiz-score]');
      if(score&&done.length===all.length) score.textContent=fill(score.dataset.template,{right:ok.length,total:all.length});
    }
  });

  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey||e.target.closest('input,textarea,select')) return;
    var k=e.key;
    if(overview&&overview.classList.contains('is-open')){if(k==='Escape'||k==='o'){e.preventDefault();openOverview(false)}return}
    if(k===' '&&e.target.closest('button,a,label')) return;
    if(k==='ArrowRight'||k==='PageDown'||(k===' '&&!e.shiftKey)){e.preventDefault();step(1)}
    else if(k==='ArrowLeft'||k==='PageUp'||(k===' '&&e.shiftKey)){e.preventDefault();step(-1)}
    else if(k==='Home'){e.preventDefault();go(0)}
    else if(k==='End'){e.preventDefault();go(n-1)}
    else if(k==='o'){e.preventDefault();openOverview(true)}
  });

  var stage=$('ok-stage'),sx=0,sy=0;
  if(stage){
    stage.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
    stage.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1)},{passive:true});
  }

  // tarefas da primeira missão
  var tasks={};try{tasks=JSON.parse(sget('tasks')||'{}')}catch(e){}
  var boxes=[].slice.call(document.querySelectorAll('[data-task]'));
  function countTasks(){var el=document.querySelector('[data-task-count]');if(!el)return;var d=boxes.filter(function(b){return b.checked}).length;el.textContent=fill(el.dataset.template,{done:d,total:boxes.length})}
  boxes.forEach(function(b){b.checked=!!tasks[b.dataset.task];b.addEventListener('change',function(){tasks[b.dataset.task]=b.checked;sset('tasks',JSON.stringify(tasks));countTasks()})});
  countTasks();

  function confetti(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box=document.createElement('div');box.className='confetti';box.setAttribute('aria-hidden','true');
    for(var i=0;i<120;i++){var p=document.createElement('i');p.style.left=(Math.random()*100)+'%';p.style.background='hsl('+Math.floor(Math.random()*360)+' 85% 60%)';p.style.setProperty('--dx',(Math.random()*240-120)+'px');p.style.setProperty('--r',(Math.random()*900-450)+'deg');p.style.animationDuration=(2.4+Math.random()*2.2)+'s';p.style.animationDelay=(Math.random()*.7)+'s';box.appendChild(p)}
    document.body.appendChild(box);setTimeout(function(){box.remove()},6000);
  }

  if(n){
    var m=/^#\\/(\\d+)$/.exec(location.hash),saved=parseInt(sget('slide')||'0',10)||0;
    if(m){go(+m[1]-1)}else{go(0);if(saved>0&&saved<n&&toast){toast.querySelector('span').textContent=fill(toast.dataset.template,{n:saved+1});toast.querySelector('[data-resume]').dataset.resume=saved;toast.classList.add('is-open');setTimeout(closeToast,9000)}}
    window.addEventListener('hashchange',function(){var h=/^#\\/(\\d+)$/.exec(location.hash);if(h)go(+h[1]-1)});
  }

  window.__okMermaid=function(){
    if(!window.mermaid) return;
    mermaid.initialize({startOnLoad:false,theme:isDark()?'dark':'neutral',securityLevel:'strict',fontFamily:'Plus Jakarta Sans, system-ui, sans-serif'});
    mermaid.run({querySelector:'pre.mermaid'});
  };
})();
`;
