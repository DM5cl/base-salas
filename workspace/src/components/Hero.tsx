import { useState } from "react";
import { DemoWidget } from "./DemoWidget";
import { Reveal, toast } from "./ui";
import { descargarPlugin } from "../lib/zip";
import { ArrowIcon, CheckIcon, DiamondIcon, DownloadIcon } from "./icons";

function FloorPlan() {
  const sillas = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      viewBox="0 0 720 540"
      fill="none"
      stroke="currentColor"
      aria-hidden
      className="pointer-events-none absolute -right-28 top-24 hidden w-[740px] text-ink opacity-[0.12] xl:block"
    >
      <rect x="20" y="20" width="680" height="500" strokeWidth="2" />
      <path d="M250 20v270M20 290h230M250 290v230M460 20v150M460 170h240M460 170v350M250 420h210" strokeWidth="2" />
      <rect x="461" y="171" width="238" height="348" fill="var(--color-pine)" opacity="0.08" stroke="none" />
      <path d="M250 210a42 42 0 0 1 42 42" strokeWidth="1.6" />
      <path d="M120 290a38 38 0 0 0 38 38" strokeWidth="1.6" />
      <path d="M460 320a42 42 0 0 1 42 42" strokeWidth="1.6" />
      <path d="M545 170a34 34 0 0 1 34-34" strokeWidth="1.6" />
      <circle cx="135" cy="155" r="34" strokeWidth="1.6" />
      {sillas.map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={135 + 54 * Math.cos(r)}
            cy={155 + 54 * Math.sin(r)}
            r="7"
            strokeWidth="1.4"
          />
        );
      })}
      <rect x="520" y="262" width="130" height="64" rx="10" strokeWidth="1.6" />
      <rect x="536" y="240" width="26" height="12" rx="4" strokeWidth="1.4" />
      <rect x="572" y="240" width="26" height="12" rx="4" strokeWidth="1.4" />
      <rect x="608" y="240" width="26" height="12" rx="4" strokeWidth="1.4" />
      <rect x="536" y="336" width="26" height="12" rx="4" strokeWidth="1.4" />
      <rect x="572" y="336" width="26" height="12" rx="4" strokeWidth="1.4" />
      <rect x="608" y="336" width="26" height="12" rx="4" strokeWidth="1.4" />
      <rect x="60" y="430" width="150" height="40" rx="10" strokeWidth="1.6" />
      <rect x="60" y="472" width="42" height="34" rx="8" strokeWidth="1.4" />
      <rect x="168" y="472" width="42" height="34" rx="8" strokeWidth="1.4" />
      <g fontFamily="JetBrains Mono, monospace" fontSize="12" fill="currentColor" stroke="none" letterSpacing="2">
        <text x="66" y="80">SALA A · 8 PAX</text>
        <text x="292" y="80">SALA B · 12 PAX</text>
        <text x="498" y="60">FOCO · 4</text>
        <text x="292" y="500">LOUNGE</text>
      </g>
    </svg>
  );
}

const MARQUEE = [
  "wp_mail() automático",
  "API REST propia",
  "nonces wp_rest",
  "shortcode [reserva_salas]",
  "dbDelta() en activación",
  "control de conflictos",
  "usuarios nativos de WP",
  "franjas configurables",
  "cancelación por el dueño",
  "panel de administración",
];

export function Marquee() {
  const fila = [...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee relative z-10 mt-20 overflow-hidden border-y border-leaf/15 bg-ink-3 py-3.5">
      <div className="marquee-track flex w-max items-center">
        {fila.map((it, i) => (
          <span key={i} className="flex items-center">
            <span className="whitespace-nowrap px-6 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/70">
              {it}
            </span>
            <DiamondIcon className="h-2 w-2 flex-none text-amber" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const [bajando, setBajando] = useState(false);

  const descargar = async () => {
    setBajando(true);
    try {
      await descargarPlugin();
      toast("reserva-salas-v1.0.0.zip generado");
    } finally {
      setTimeout(() => setBajando(false), 600);
    }
  };

  return (
    <section id="demo" className="relative overflow-hidden scroll-mt-20">
      <div className="dotgrid absolute inset-0 [mask-image:linear-gradient(to_bottom,black_20%,transparent_92%)]" />
      <FloorPlan />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-4 pt-32 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:pt-40">
        {/* -------- columna de texto -------- */}
        <div>
          <Reveal>
            <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.24em] text-pine">
              <span className="h-2.5 w-2.5 flex-none rotate-45 bg-pine" />
              Plugin WordPress · PHP / JS / HTML / CSS
            </p>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-5 font-display text-[clamp(2rem,4.8vw,3.7rem)] font-bold leading-[1.06] tracking-tight text-ink">
              Tus salas de reunión,{" "}
              <span className="ul-brush whitespace-nowrap">agendadas</span> sin
              salir de WordPress.
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-mist">
              <strong className="text-ink">Reserva Salas</strong> añade un sistema
              completo de reservas a tu web: gestión de salas, disponibilidad por
              franjas con control de conflictos, la identidad de tus usuarios de
              WordPress y un correo de confirmación con{" "}
              <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[0.85em] text-pine">
                wp_mail()
              </code>{" "}
              en cada paso.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
              {[
                "Usuarios nativos de WP",
                "API REST + nonces",
                "Correo automático",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-pine/12 text-pine">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={310}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={descargar}
                disabled={bajando}
                className="hard hs-leaf flex items-center gap-2.5 rounded-lg bg-ink px-6 py-3.5 font-bold text-paper"
              >
                <DownloadIcon className="h-5 w-5 text-amber" strokeWidth={2.1} />
                {bajando ? "Generando…" : "Descargar plugin (.zip)"}
              </button>
              <a
                href="#codigo"
                className="group flex items-center gap-2.5 rounded-lg border-2 border-ink px-6 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Explorar el código
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.2} />
              </a>
            </div>
          </Reveal>

          <Reveal delay={380}>
            <p className="mt-7 font-mono text-[11px] tracking-wide text-mist">
              v1.0.0 <span className="text-line">|</span> GPL-2.0{" "}
              <span className="text-line">|</span> PHP ≥ 7.4{" "}
              <span className="text-line">|</span> WP ≥ 6.0{" "}
              <span className="text-line">|</span> 0 dependencias
            </p>
          </Reveal>
        </div>

        {/* -------- widget en vivo -------- */}
        <Reveal delay={200} className="relative">
          <div className="transition-transform duration-500 lg:rotate-[0.8deg] lg:hover:rotate-0">
            <DemoWidget />
          </div>
          <p className="mt-4 text-center font-mono text-[11px] text-mist lg:text-left">
            <span className="text-pine">▸</span> Demo funcional — réplica del
            widget que pinta <span className="text-ink">[reserva_salas]</span> en tu web.
          </p>
        </Reveal>
      </div>

      <Marquee />
    </section>
  );
}
