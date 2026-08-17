import { useState } from "react";
import { LogoMark, DownloadIcon } from "./icons";
import { toast } from "./ui";
import { descargarPlugin } from "../lib/zip";

const LINKS = [
  { href: "#demo", label: "Demo" },
  { href: "#codigo", label: "Código" },
  { href: "#instalacion", label: "Instalación" },
  { href: "#correo", label: "Correo" },
  { href: "#seguridad", label: "Seguridad" },
];

export function Header() {
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-leaf/15 bg-ink-3/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <a href="#demo" className="group flex items-center gap-3">
          <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold tracking-tight text-paper">
              Reserva<span className="text-leaf">Salas</span>
            </span>
            <span className="block font-mono text-[10px] tracking-[0.14em] text-paper/50">
              PLUGIN WP · v1.0.0
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="navlink font-mono text-[11px] uppercase tracking-[0.18em] text-paper/70"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <button
          onClick={descargar}
          disabled={bajando}
          className="hard hs-leaf flex items-center gap-2 rounded-md bg-amber px-4 py-2 text-sm font-bold text-ink"
        >
          <DownloadIcon className="h-4 w-4" strokeWidth={2.2} />
          <span className="hidden sm:inline">Descargar .zip</span>
        </button>
      </div>
    </header>
  );
}
