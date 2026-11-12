export const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";

export const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">';

const DARK = `--bg:#111110;--surface:#1a1918;--surface-2:#232220;--text:#f2f0eb;--muted:#a19d94;--border:#2c2a28;--track:#2a2826;--shadow:0 1px 2px rgb(0 0 0/.3),0 10px 30px rgb(0 0 0/.35);--al:70%;--as:78%;--on-accent:#111110;--code-bg:#262422;color-scheme:dark`;

export const CSS = `
:root{--bg:#faf9f6;--surface:#fff;--surface-2:#f3f1ec;--text:#1b1a18;--muted:#68645c;--border:#e6e3dc;--track:#e8e5de;--shadow:0 1px 2px rgb(30 25 15/.04),0 10px 30px rgb(30 25 15/.07);--al:47%;--as:72%;--on-accent:#fff;--code-bg:#f1efe9;--term-bg:#161514;--term-text:#efece5;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
/* marcas sem cor (preto/cinza): destaque escuro no claro e claro no escuro */
:root[data-mono]{--al:26%;--wl:16%}
@media (prefers-color-scheme:dark){:root[data-mono]:not([data-theme="light"]){--al:84%;--wl:24%}}
:root[data-mono][data-theme="dark"]{--al:84%;--wl:24%}
@property --bh{syntax:"<number>";inherits:true;initial-value:255}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--bg);color:var(--text);font:16px/1.6 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
body.solo{overflow:auto}
button{font:inherit;color:inherit}
code,pre{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
code{font-size:.85em;background:var(--code-bg);padding:.12em .42em;border-radius:6px}
pre{margin:12px 0 0;background:var(--code-bg);border-radius:12px;padding:14px 16px;overflow-x:auto;font-size:.82rem;line-height:1.6}
pre code{background:none;padding:0;font-size:inherit}
:focus-visible{outline:2px solid hsl(var(--h,255) calc(var(--as) * var(--k,1)) var(--al));outline-offset:2px}

/* ── estrutura ── */
.deck{position:fixed;inset:0;z-index:1;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.topbar{display:flex;align-items:center;gap:18px;padding:16px 24px;z-index:3}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.01em;white-space:nowrap;min-width:0}
.brand-name{max-width:20ch;overflow:hidden;text-overflow:ellipsis}
.brand-mark,.brand-logo,.solo-logo{display:inline-grid;place-items:center;flex:none;background:#fff;border-radius:12px;box-shadow:0 1px 2px rgb(0 0 0/.08),0 0 0 1px rgb(0 0 0/.05)}
.brand-mark{height:34px;padding:5px 8px;border-radius:10px}
.brand-mark img{height:100%;width:auto;max-width:90px;object-fit:contain}
.segments{flex:1;display:flex;gap:5px;align-items:center;min-width:0;height:20px}
.seg{flex:var(--w) 1 0;min-width:6px;height:6px;border:0;padding:0;border-radius:99px;background:var(--track);cursor:pointer;overflow:hidden;position:relative;transition:height .2s}
.seg:hover,.seg.is-current{height:9px}
.seg>span{position:absolute;inset:0 auto 0 0;width:0;border-radius:inherit;background:hsl(var(--h) calc(var(--as) * var(--k,1)) var(--al));transition:width .5s cubic-bezier(.2,.7,.2,1)}
.icon-btn{flex:none;width:40px;height:40px;display:grid;place-items:center;border-radius:12px;border:1px solid var(--border);background:var(--surface);cursor:pointer;color:var(--muted);transition:color .2s,transform .2s}
.icon-btn:hover{color:var(--text);transform:translateY(-1px)}
.icon-btn svg{width:18px;height:18px}
.stage{position:relative;overflow:hidden}

/* ── slides ── */
.slide{--accent:hsl(var(--h) calc(var(--as) * var(--k,1)) var(--al));--accent-soft:hsl(var(--h) calc(85% * var(--k,1)) 55% / .13);position:absolute;inset:0;display:flex;opacity:0;visibility:hidden;transform:translateX(72px) scale(.97);filter:blur(6px);transition:opacity .5s ease,transform .75s cubic-bezier(.16,1,.3,1),filter .5s ease,visibility .5s}
.slide.is-before{transform:translateX(-72px) scale(.97)}
.slide.is-active{opacity:1;visibility:visible;transform:none;filter:none}
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

/* entrada dos elementos: cabeçalho primeiro, depois os blocos em cascata (--i vem do JS) */
.slide.is-active .slide-inner>.kicker{animation:kick-in .6s cubic-bezier(.16,1,.3,1) .08s both}
.slide.is-active .slide-inner>.title,.slide.is-active .welcome>.title,.slide.is-active .finale>.title{animation:title-in .9s cubic-bezier(.16,1,.3,1) .12s both}
.slide.is-active .slide-inner>.lede,.slide.is-active .slide-inner>.statement,.slide.is-active .slide-inner>.mini-label{animation:rise .7s cubic-bezier(.16,1,.3,1) .22s both}
.slide.is-active .reveal>*{animation:rise .75s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(.28s + var(--i,0) * 70ms)}
.slide.is-active .welcome>*:not(.title):not(.brand-logo),.slide.is-active .finale>*:not(.title):not(.party){animation:rise .8s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(.1s + var(--i,0) * 80ms)}
.slide.is-active .tour-step>*{animation:rise .75s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(.15s + var(--i,0) * 120ms)}
.slide.is-active .bignum{animation:num-in 1.1s cubic-bezier(.16,1,.3,1) .1s both}
@keyframes rise{from{opacity:0;translate:0 22px;scale:.97}}
@keyframes kick-in{from{opacity:0;translate:-22px 0}}
@keyframes title-in{from{opacity:0;translate:0 28px;filter:blur(12px);letter-spacing:-.01em}}
@keyframes num-in{from{opacity:0;scale:1.6;filter:blur(10px)}}

/* fundo vivo: manchas de cor que derivam devagar e mudam de tom junto com o capítulo */
.backdrop{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;transition:--bh 1.2s ease}
.backdrop i{position:absolute;border-radius:50%;width:74vmax;height:74vmax;right:-30vmax;top:-38vmax;background:radial-gradient(circle,hsl(var(--bh) calc(90% * var(--k,1)) 62% / .2),transparent 62%);animation:drift 24s ease-in-out infinite alternate}
.backdrop i:nth-child(2){right:auto;top:auto;left:-26vmax;bottom:-34vmax;width:56vmax;height:56vmax;background:radial-gradient(circle,hsl(var(--h2,calc(var(--bh) + 50)) calc(90% * var(--k,1)) 62% / .13),transparent 62%);animation-duration:30s;animation-direction:alternate-reverse}
.backdrop i:nth-child(3){right:auto;top:38%;left:34%;width:40vmax;height:40vmax;background:radial-gradient(circle,hsl(calc(var(--bh) - 40) calc(90% * var(--k,1)) 64% / .08),transparent 62%);animation-duration:36s}
@keyframes drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-7vmax,5vmax) scale(1.1)}100%{transform:translate(5vmax,-4vmax) scale(.94)}}

/* cortina entre capítulos */
.wipe{position:absolute;inset:0;z-index:6;display:grid;place-content:center;justify-items:center;gap:4px;padding:24px;text-align:center;color:#fff;pointer-events:none;visibility:hidden;clip-path:inset(0 100% 0 0);background:linear-gradient(125deg,hsl(var(--h,255) calc(78% * var(--k,1)) var(--wl,46%)),hsl(calc(var(--h,255) + 24) calc(82% * var(--k,1)) calc(var(--wl,46%) - 10%)))}
.wipe span{font-size:clamp(4.5rem,3rem + 8vw,10rem);font-weight:800;line-height:.9;letter-spacing:-.06em;opacity:.35}
.wipe strong{font-size:clamp(1.6rem,1.2rem + 2vw,3rem);font-weight:800;letter-spacing:-.03em}
.wipe.run{visibility:visible;animation:wipe 1s cubic-bezier(.77,0,.18,1) both}
.wipe.run.back{animation-name:wipe-back}
.wipe.run>*{animation:wipe-text 1s cubic-bezier(.16,1,.3,1) both}
.wipe.run>strong{animation-delay:.04s}
@keyframes wipe{0%{clip-path:inset(0 100% 0 0)}40%,58%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 0 0 100%)}}
@keyframes wipe-back{0%{clip-path:inset(0 0 0 100%)}40%,58%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 100% 0 0)}}
@keyframes wipe-text{0%,22%{opacity:0;translate:0 18px;scale:.94}42%,60%{opacity:1;translate:0 0;scale:1}88%,100%{opacity:0;translate:0 -14px}}

/* ── blocos ── */
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))}
.grid-2{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.stack-list,.rules,.tasks,.modules,.quiz{display:grid;gap:14px}
.card{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;box-shadow:var(--shadow)}
/* cartões inclinam na direção do mouse e ganham um brilho que segue o cursor */
.card,.module,.task{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .3s,border-color .25s,opacity .25s}
.card:hover,.module:hover,.task:hover{box-shadow:0 2px 4px rgb(0 0 0/.05),0 18px 40px hsl(var(--h,255) calc(60% * var(--k,1)) 30% / .16)}
.card::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),hsl(var(--h,255) calc(90% * var(--k,1)) 60% / .12),transparent 45%)}
.card:hover::after{opacity:1}
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
.cmd code::before{content:"$ ";color:hsl(var(--h) calc(75% * var(--k,1)) 66%)}
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
.task{display:flex;gap:16px;align-items:flex-start;padding:18px 20px;border-radius:18px;background:var(--surface);border:1px solid var(--border);cursor:pointer;box-shadow:var(--shadow)}
.task:hover{border-color:var(--accent)}
.task input{appearance:none;-webkit-appearance:none;flex:none;width:26px;height:26px;margin:1px 0 0;border-radius:9px;border:2px solid var(--border);display:grid;place-items:center;cursor:pointer;transition:background .2s,border-color .2s}
.task input:checked{background:var(--accent);border-color:var(--accent);animation:check .45s cubic-bezier(.2,1.6,.4,1)}
@keyframes check{50%{scale:1.25}}
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
.grad{background:linear-gradient(110deg,hsl(var(--h) calc(85% * var(--k,1)) var(--al)),hsl(var(--h2,calc(var(--h) + 70)) calc(85% * var(--k,1)) var(--al)),hsl(var(--h) calc(85% * var(--k,1)) var(--al)));background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shimmer 7s linear infinite}
@keyframes shimmer{to{background-position:-200% center}}
.brand-logo{height:clamp(56px,10vh,84px);padding:10px 14px;border-radius:18px;margin-bottom:22px}
.brand-logo img{height:100%;width:auto;max-width:260px;object-fit:contain}
.slide.is-active .brand-logo{animation:logo-in .9s cubic-bezier(.2,1.5,.4,1) both,float 6s ease-in-out 1s infinite}
@keyframes logo-in{from{opacity:0;scale:.6;rotate:-8deg}}
@keyframes float{50%{translate:0 -6px}}
.tagline{font-size:clamp(1.15rem,1rem + .7vw,1.5rem);font-weight:600;margin:0 0 14px;max-width:44ch;text-wrap:balance}
.cta{display:inline-flex;align-items:center;gap:10px;padding:15px 24px;border-radius:16px;border:0;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:1.02rem;cursor:pointer;box-shadow:0 10px 28px hsl(var(--h) calc(80% * var(--k,1)) 50% / .35);transition:transform .2s,box-shadow .2s}
.cta:hover{transform:translateY(-2px);box-shadow:0 14px 34px hsl(var(--h) calc(80% * var(--k,1)) 50% / .42)}
.cta .arrow{transition:transform .2s}.cta:hover .arrow{transform:translateX(3px)}
.journey{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.journey button{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:99px;background:var(--surface);border:1px solid var(--border);cursor:pointer;font-size:.86rem;font-weight:600;transition:border-color .2s,transform .2s}
.journey button:hover{border-color:hsl(var(--ch) calc(var(--as) * var(--k,1)) var(--al));transform:translateY(-1px)}
.journey .n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-size:.72rem;font-weight:800;background:hsl(var(--ch) calc(85% * var(--k,1)) 55% / .15);color:hsl(var(--ch) calc(var(--as) * var(--k,1)) var(--al))}
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
.recap li::before{content:"✓ ";color:hsl(var(--ch) calc(var(--as) * var(--k,1)) var(--al));font-weight:800}
.task-count{color:var(--muted);font-weight:600;margin:0 0 26px}
.actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.ghost{padding:15px 22px;border-radius:16px;border:1px solid var(--border);background:var(--surface);font-weight:700;cursor:pointer}
.ghost:hover{border-color:var(--accent)}

/* git, qualidade, docs, todos, cola */
.mini-label.sub{margin-top:18px}
.facts{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 22px}
.statement.small+.facts{margin-top:22px}
.fact{display:flex;flex-direction:column;gap:6px;padding:14px 18px;border-radius:16px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);min-width:160px}
.fact .label{margin:0}
.fact strong{font-size:1.1rem;letter-spacing:-.01em}
.fact code{align-self:flex-start;font-size:.9rem;background:var(--accent-soft);color:var(--accent)}
.inline-cmd{display:flex;gap:10px;align-items:center}
.inline-cmd .copy,.cheat .copy{color:var(--text);border-color:var(--border)}
.inline-cmd .copy:hover,.cheat .copy:hover{background:var(--surface-2)}
.subproject .label{margin:2px 0 6px;color:var(--muted)}
.subproject .badges{margin-top:10px}
.subproject .inline-cmd{margin-top:12px;min-width:0}
.subproject .inline-cmd code{overflow-wrap:anywhere}
.branch-map{position:relative;display:grid;gap:12px;margin:8px 0 6px;padding-left:34px}
.branch-map::before{content:"";position:absolute;left:11px;top:14px;bottom:14px;width:4px;border-radius:4px;background:linear-gradient(var(--accent),var(--accent-soft))}
.trunk,.branch{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}
.trunk::before,.branch::before{content:"";position:absolute;left:-30px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px var(--accent-soft)}
.branch::before{width:12px;height:12px;margin-top:-6px;left:-28px;background:var(--surface);border:3px solid var(--accent);box-shadow:none}
.branch::after{content:"";position:absolute;left:-17px;top:50%;width:13px;height:2px;background:var(--accent);opacity:.5}
.trunk code{font-size:1rem;font-weight:700;background:var(--accent);color:var(--on-accent);padding:.3em .8em}
.branch code{font-size:.9rem;background:var(--surface);border:1px solid var(--border);padding:.3em .7em}
.branch span{color:var(--muted)}
.commit-format{padding:22px;border-radius:20px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);margin-bottom:24px}
.commit-format code{display:block;font-size:clamp(1rem,.9rem + .6vw,1.35rem);background:none;padding:0;margin:4px 0 0;color:var(--accent);font-weight:500;word-break:break-word}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.checklist{list-style:none;padding:0;margin:0;display:grid;gap:6px}
.checklist li{display:flex;gap:10px;color:var(--muted)}
.checklist li::before{content:"";flex:none;width:16px;height:16px;margin-top:4px;border-radius:5px;border:2px solid var(--accent)}
.envs{margin-top:16px}
.envs .step>span{display:flex;flex-direction:column;line-height:1.2}
.envs small{font-size:.72rem;font-weight:600;color:var(--muted)}
.timeline{list-style:none;padding:0;margin:0;display:grid;gap:0}
.timeline li{position:relative;display:grid;grid-template-columns:120px 1fr;gap:18px;padding:12px 0}
.timeline li:not(:last-child)::after{content:"";position:absolute;left:59px;top:44px;bottom:-12px;width:2px;background:var(--border)}
.timeline .when{justify-self:center;align-self:start;padding:5px 12px;border-radius:99px;background:var(--accent-soft);color:var(--accent);font-size:.74rem;font-weight:800;text-align:center;white-space:nowrap;position:relative;z-index:1}
.timeline p{margin:2px 0 0;color:var(--muted)}
.timeline .evidence{margin-top:8px}
.kind{flex:none;font:800 .68rem/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;padding:5px 9px;border-radius:7px;background:var(--accent-soft);color:var(--accent)}
.kind-fixme,.kind-bug,.kind-warning{background:hsl(0 80% 55% / .14);color:hsl(0 70% var(--al))}
.kind-hack,.kind-xxx,.kind-important{background:hsl(32 90% 55% / .16);color:hsl(28 80% var(--al))}
.kind-deprecated{background:var(--surface-2);color:var(--muted);text-decoration:line-through}
.note{border-left:4px solid var(--accent)}
.todo .impact{margin-top:12px;padding:10px 12px;border-radius:12px;background:var(--surface-2);color:var(--text);font-size:.92rem}
.todo .impact .label{margin-bottom:2px}
.todo-total{display:flex;align-items:center;gap:18px;margin:0 0 18px}
.todo-total strong{font-size:clamp(3.5rem,2.5rem + 4vw,6rem);font-weight:800;line-height:.9;letter-spacing:-.05em;color:var(--accent);font-variant-numeric:tabular-nums}
.todo-total span{display:flex;flex-direction:column;font-weight:700;font-size:1.1rem}
.todo-total small{font-weight:500;font-size:.82rem;color:var(--muted)}
.kind-counts{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 26px}
.kind-count{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow)}
.kind-count strong{font-size:1.3rem;font-variant-numeric:tabular-nums}
.bars{display:grid;gap:10px;max-width:640px}
.bar{display:grid;grid-template-columns:minmax(80px,180px) 1fr 40px;gap:12px;align-items:center}
.bar code{justify-self:start;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.bar .track{height:10px;border-radius:99px;background:var(--track);overflow:hidden}
.bar .track span{display:block;height:100%;width:0;border-radius:inherit;background:var(--accent);transition:width 1s cubic-bezier(.16,1,.3,1) .3s}
.slide.is-active .bar .track span{width:var(--p)}
.bar b{font-variant-numeric:tabular-nums;text-align:right}
.cheats{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));margin-bottom:16px}
.cheat{display:flex;flex-direction:column;gap:8px;padding:16px 18px;border-radius:18px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow)}
.cheat .label{margin:0}
.cheat code{align-self:flex-start;font-size:.88rem;background:var(--code-bg);word-break:break-word}
.cheat .copy{align-self:flex-start;margin-top:auto}
.cheat-extras .card p{color:var(--text)}

/* ── controles ── */
.controls{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:12px 24px 20px;z-index:3}
.controls [data-prev]{justify-self:start}
.controls [data-next]{justify-self:end}
.nav-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-weight:700;cursor:pointer;box-shadow:var(--shadow);transition:transform .2s,opacity .2s}
.nav-btn:hover:not(:disabled){transform:translateY(-1px)}
.nav-btn.primary{background:var(--brand-c,var(--text));color:var(--brand-on,var(--bg));border-color:var(--brand-c,var(--text))}
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
.ov-chapter h3 .n{display:grid;place-items:center;width:26px;height:26px;border-radius:9px;font-size:.78rem;background:hsl(var(--ch) calc(85% * var(--k,1)) 55% / .15);color:hsl(var(--ch) calc(var(--as) * var(--k,1)) var(--al))}
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
.solo-wrap{position:relative;z-index:1;min-height:100%;display:grid;place-items:center;padding:32px 16px;--accent:hsl(var(--h) calc(var(--as) * var(--k,1)) var(--al));--accent-soft:hsl(var(--h) calc(85% * var(--k,1)) 55% / .13)}
.solo-card{max-width:680px;width:100%;background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:28px;padding:36px;box-shadow:var(--shadow)}
.solo-card>*{animation:rise .8s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0) * 80ms)}
.solo-logo{display:grid;width:fit-content;height:56px;padding:8px 12px;border-radius:16px;margin-bottom:18px}
.solo-logo img{height:100%;width:auto;max-width:200px;object-fit:contain}
.solo-steps{list-style:none;padding:0;margin:0 0 18px;display:grid;gap:10px}
.solo-steps li{display:flex;gap:12px;align-items:center;font-weight:600}
.solo-steps b{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:.82rem}
.prompt-box{position:relative;border-radius:18px;padding:3px;background:linear-gradient(120deg,var(--accent),hsl(var(--h2,calc(var(--h) + 60)) calc(85% * var(--k,1)) 60%),var(--accent));background-size:200% auto;animation:shimmer 6s linear infinite}
.prompt-text{margin:0;border-radius:15px;background:var(--surface);padding:18px 18px 70px;white-space:pre-wrap;font-size:.86rem;line-height:1.65;user-select:all;-webkit-user-select:all;cursor:text}
.copy-cta{position:absolute;right:14px;bottom:14px;padding:11px 18px;font-size:.92rem;border-radius:12px}
.solo-card .waiting{display:flex;align-items:center;gap:10px;margin:20px 0 0;font-weight:600;color:var(--muted)}
.pulse{position:relative;width:10px;height:10px;border-radius:50%;background:var(--accent)}
.pulse::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--accent);animation:ping 1.6s cubic-bezier(0,0,.2,1) infinite}
@keyframes ping{75%,100%{transform:scale(2.6);opacity:0}}
.solo-card .progress .mini-label{margin-bottom:10px}
.progress{margin-top:22px;padding-top:20px;border-top:1px solid var(--border)}
.progress-bar{height:6px;border-radius:99px;background:var(--track);overflow:hidden;margin-bottom:14px}
.progress-bar span{display:block;height:100%;border-radius:inherit;background:var(--accent);transition:width .8s cubic-bezier(.16,1,.3,1)}
.progress-list{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
.progress-list li{padding:5px 12px;border-radius:99px;border:1px solid var(--border);font-size:.8rem;font-weight:600;color:var(--muted);transition:background .4s,color .4s,border-color .4s}
.progress-list li.is-done{background:var(--accent-soft);border-color:transparent;color:var(--accent)}
.progress-list li.is-done::before{content:"✓ "}
.progress-list li.pop{animation:check .5s cubic-bezier(.2,1.6,.4,1)}
.manual{margin:18px 0 0!important;font-size:.88rem}
.error-text{white-space:pre-wrap}
.solo-card h1{font-size:clamp(1.6rem,1.2rem + 1.4vw,2.2rem);letter-spacing:-.03em;line-height:1.15;margin:0 0 12px}
.solo-card p{color:var(--muted);margin:0 0 20px}
.prompt{display:flex;gap:10px;align-items:flex-start}
.prompt pre{flex:1;white-space:pre-wrap;margin:0}
.prompt .copy{color:var(--text);border-color:var(--border)}

/* ── telas pequenas ── */
@media (max-width:760px){
  .topbar{padding:12px 16px;gap:10px}
  .brand-name{display:none}
  .slide-inner{padding:12px 16px 28px}
  .controls{padding:10px 16px 14px;gap:8px}
  .nav-btn{padding:11px 14px}
  .nav-btn .txt,.hint{display:none}
  .rule,.tour-step{grid-template-columns:1fr;gap:6px}
  .timeline li{grid-template-columns:1fr;gap:6px}
  .timeline .when{justify-self:start}
  .timeline li::after{display:none}
  .module{grid-template-columns:1fr;gap:6px}
  .bignum{font-size:4rem}
  .journey-wrap{margin-top:32px}
  .solo-card{padding:24px}
  .prompt-text{padding-bottom:64px}
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
  var overview=$('ok-overview'),toast=$('ok-toast'),hint=$('ok-hint'),wipe=$('ok-wipe'),backdrop=$('ok-backdrop'),timer=0;
  function reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches}

  // índice de cada filho, para a entrada em cascata
  [].forEach.call(document.querySelectorAll('.reveal,.welcome,.finale,.tour-step,.solo-card'),function(box){[].forEach.call(box.children,function(c,j){c.style.setProperty('--i',j)})});

  function show(i){
    slides.forEach(function(s,j){var on=j===i;s.classList.toggle('is-active',on);s.classList.toggle('is-before',j<i);s.setAttribute('aria-hidden',on?'false':'true');if('inert' in s)s.inert=!on});
    var s=slides[i],inner=s.querySelector('.slide-inner'); if(inner) inner.scrollTop=0;
    if(backdrop) backdrop.style.setProperty('--bh',s.style.getPropertyValue('--h'));
    if(s.dataset.kind==='finale'&&!celebrated){celebrated=true;confetti()}
    [].forEach.call(s.querySelectorAll('[data-count]'),countUp);
  }
  function countUp(el){
    var to=+el.dataset.count; if(reduced()||!to){el.textContent=to;return}
    var t0=null;
    function tick(ts){if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/1100);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)}
    el.textContent='0';setTimeout(function(){requestAnimationFrame(tick)},250);
  }
  // cortina com o número e o nome do capítulo; o slide troca por baixo quando ela cobre a tela
  function runWipe(s,back){
    wipe.style.setProperty('--h',s.style.getPropertyValue('--h'));
    wipe.firstElementChild.textContent=s.dataset.chapterNum||'';
    wipe.lastElementChild.textContent=s.dataset.chapterName||'';
    wipe.classList.remove('run','back'); void wipe.offsetWidth;
    wipe.classList.add('run'); if(back) wipe.classList.add('back');
  }
  if(wipe) wipe.addEventListener('animationend',function(e){if(e.target===wipe)wipe.classList.remove('run','back')});

  function go(i){
    if(!n) return;
    i=Math.max(0,Math.min(n-1,i|0)); if(i===cur) return;
    var prev=cur,s=slides[i];
    if(timer){clearTimeout(timer);timer=0}
    cur=i;
    if(prev>=0&&wipe&&!reduced()&&slides[prev].dataset.chapter!==s.dataset.chapter){
      runWipe(s,i<prev);
      timer=setTimeout(function(){timer=0;show(i)},400);
    }else show(i);
    segs.forEach(function(g){var st=+g.dataset.start,c=+g.dataset.count,p=i<st?0:i>=st+c?1:(i-st+1)/c;g.firstElementChild.style.width=(p*100)+'%';g.classList.toggle('is-current',i>=st&&i<st+c)});
    $('ok-chapter').textContent=s.dataset.chapterName;
    $('ok-count').textContent=(i+1)+' / '+n;
    prevBtn.disabled=i===0; nextBtn.disabled=i===n-1;
    [].forEach.call(document.querySelectorAll('.ov-chapter [data-go]'),function(b){b.classList.toggle('is-current',+b.dataset.go===i)});
    try{history.replaceState(null,'','#/'+(i+1))}catch(e){}
    sset('slide',String(i));
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
      var done=function(){el.textContent=el.dataset.done||'✓';el.classList.add('is-copied');setTimeout(function(){el.textContent=orig;el.classList.remove('is-copied')},1800)};
      // fora de HTTPS/localhost não há navigator.clipboard: cai no execCommand
      var fallback=function(){var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){}ta.remove()};
      if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(txt).then(done,fallback); else fallback();
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

  // cartões inclinam na direção do mouse
  var tilted=null;
  document.addEventListener('pointermove',function(e){
    if(e.pointerType!=='mouse'||reduced()) return;
    var el=e.target.closest&&e.target.closest('.slide .card,.slide .module,.slide .task');
    if(tilted&&tilted!==el){tilted.style.removeProperty('--rx');tilted.style.removeProperty('--ry')}
    tilted=el; if(!el) return;
    var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    el.style.setProperty('--rx',((.5-y)*5).toFixed(2)+'deg');el.style.setProperty('--ry',((x-.5)*6).toFixed(2)+'deg');
    el.style.setProperty('--mx',(x*100).toFixed(1)+'%');el.style.setProperty('--my',(y*100).toFixed(1)+'%');
  },{passive:true});

  // páginas de espera: consultam a rota e recarregam quando o onboarding muda de estado
  var state=document.body.dataset.okState;
  if(state){
    var poll=function(){
      fetch(location.href,{cache:'no-store'}).then(function(r){return r.text()}).then(function(html){
        var m=/data-ok-state="(\w+)"/.exec(html);
        if(!m||m[1]!==state) return location.reload();
        var box=$('ok-progress'); if(!box) return;
        var next=new DOMParser().parseFromString(html,'text/html').getElementById('ok-progress');
        if(!next||next.innerHTML===box.innerHTML) return;
        var before={};[].forEach.call(box.querySelectorAll('.is-done'),function(li){before[li.dataset.key]=1});
        box.innerHTML=next.innerHTML;
        [].forEach.call(box.querySelectorAll('.is-done'),function(li){if(!before[li.dataset.key])li.classList.add('pop')});
      }).catch(function(){}).then(function(){setTimeout(poll,2500)});
    };
    setTimeout(poll,2500);
  }

  function confetti(){
    if(reduced()) return;
    var pal=(root.dataset.palette||'').split(' ').filter(Boolean);
    var box=document.createElement('div');box.className='confetti';box.setAttribute('aria-hidden','true');
    for(var i=0;i<140;i++){var p=document.createElement('i');p.style.left=(Math.random()*100)+'%';p.style.background=pal.length&&Math.random()<.75?pal[i%pal.length]:'hsl('+Math.floor(Math.random()*360)+' 85% 60%)';p.style.setProperty('--dx',(Math.random()*240-120)+'px');p.style.setProperty('--r',(Math.random()*900-450)+'deg');p.style.animationDuration=(2.4+Math.random()*2.2)+'s';p.style.animationDelay=(Math.random()*.7)+'s';box.appendChild(p)}
    document.body.appendChild(box);setTimeout(function(){box.remove()},6000);
  }

  if(n){
    var m=/^#\\/(\\d+)$/.exec(location.hash),saved=parseInt(sget('slide')||'0',10)||0;
    if(m){go(+m[1]-1)}else{go(0);if(saved>0&&saved<n&&toast){toast.querySelector('span').textContent=fill(toast.dataset.template,{n:saved+1});toast.querySelector('[data-resume]').dataset.resume=saved;toast.classList.add('is-open');setTimeout(closeToast,9000)}}
    window.addEventListener('hashchange',function(){var h=/^#\\/(\\d+)$/.exec(location.hash);if(h)go(+h[1]-1)});
  }

  window.__okMermaid=function(){
    if(!window.mermaid) return;
    var brand=(root.dataset.palette||'').split(' ')[0],dark=isDark();
    // mistura a cor da marca com o fundo para pintar os nós sem perder a leitura do texto
    function mix(hex,base,a){var c=function(h,i){return parseInt(h.substr(1+i*2,2),16)};var o='#';for(var i=0;i<3;i++)o+=('0'+Math.round(c(hex,i)*a+c(base,i)*(1-a)).toString(16)).slice(-2);return o}
    var vars=brand?{primaryColor:mix(brand,dark?'#1a1918':'#ffffff',.16),primaryBorderColor:brand,lineColor:brand,primaryTextColor:dark?'#f2f0eb':'#1b1a18',secondaryColor:mix(brand,dark?'#1a1918':'#ffffff',.08),tertiaryColor:dark?'#232220':'#f3f1ec',darkMode:dark,fontFamily:'Plus Jakarta Sans, system-ui, sans-serif'}:undefined;
    mermaid.initialize({startOnLoad:false,theme:brand?'base':dark?'dark':'neutral',themeVariables:vars,securityLevel:'strict',fontFamily:'Plus Jakarta Sans, system-ui, sans-serif'});
    mermaid.run({querySelector:'pre.mermaid'});
  };
})();
`;
