import { useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { CodeExplorer } from "./components/CodeExplorer";
import { Install } from "./components/Install";
import { EmailFlow } from "./components/EmailFlow";
import { Security } from "./components/Security";
import { Reveal, ToastHost, toast, useCopy } from "./components/ui";
import { LogoMark, DownloadIcon, ArrowIcon } from "./components/icons";
import { descargarPlugin } from "./lib/zip";

function CtaBand() {
  const copy = useCopy();
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
    <section className="relative overflow-hidden bg-pine text-paper">
      <div className="noise-soft pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-10 px-5 py-20 lg:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-paper/70">
            9 archivos · PHP, JS, HTML y CSS · sin dependencias
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">
            Listo para agendar
            <br />
            tu primera sala.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="flex flex-col items-start gap-4">
            <button
              onClick={descargar}
              disabled={bajando}
              className="hard group flex items-center gap-3 rounded-lg bg-amber px-7 py-4 text-[15px] font-bold text-ink"
              style={{ "--hs": "#14532f" } as React.CSSProperties}
            >
              <DownloadIcon className="h-5 w-5" strokeWidth={2.2} />
              {bajando ? "Generando ZIP…" : "Descargar reserva-salas.zip"}
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </button>
            <button
              onClick={() => copy("[reserva_salas]", "Shortcode copiado")}
              className="font-mono text-[12.5px] text-paper/85 underline decoration-paper/40 underline-offset-8 transition-colors hover:text-white hover:decoration-amber"
            >
              o copia el shortcode → [reserva_salas]
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink-3 pb-8 pt-14 text-paper/60">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-sm">
            <a href="#demo" className="flex items-center gap-3">
              <LogoMark className="h-9 w-9" />
              <span className="font-display text-[15px] font-semibold text-paper">
                Reserva<span className="text-leaf">Salas</span>
              </span>
            </a>
            <p className="mt-4 text-[13.5px] leading-relaxed">
              Plugin de reservas de salas de reunión para WordPress: usuarios nativos,
              disponibilidad por franjas, API REST y correos con wp_mail().
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-14 gap-y-2.5 font-mono text-[11.5px] uppercase tracking-[0.16em]">
            {[
              ["#demo", "Demo en vivo"],
              ["#codigo", "Código fuente"],
              ["#instalacion", "Instalación"],
              ["#correo", "Flujo de correo"],
              ["#seguridad", "Seguridad"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="transition-colors hover:text-leaf">
                {label}
              </a>
            ))}
          </nav>

          <div className="font-mono text-[11.5px] leading-loose text-paper/40">
            <p>licencia GPL-2.0-or-later</p>
            <p>requiere WordPress ≥ 6.0 · PHP ≥ 7.4</p>
            <p>prefijos RS_ / rs_ / reserva-salas/v1</p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 pt-6 font-mono text-[10.5px] text-paper/35">
          <span>reserva-salas v1.0.0 — PHP · JS · HTML · CSS</span>
          <span>
            hecho con <span className="text-leaf">dbDelta()</span>,{" "}
            <span className="text-amber">wp_mail()</span> y cariño
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <CodeExplorer />
        <Install />
        <EmailFlow />
        <Security />
        <CtaBand />
      </main>
      <Footer />
      <ToastHost />
    </div>
  );
}
