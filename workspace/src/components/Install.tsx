import { ReactNode, useState } from "react";
import { Reveal, Ticks, toast, useCopy } from "./ui";
import { CheckIcon, CopyIcon, DownloadIcon } from "./icons";
import { descargarPlugin } from "../lib/zip";

function Snippet({ children, code }: { children: ReactNode; code?: string }) {
  const copy = useCopy();
  return (
    <span className="mt-3 inline-flex max-w-full items-center gap-3 rounded-lg border border-line bg-white px-3.5 py-2 font-mono text-[12.5px] text-ink shadow-sm">
      <span className="truncate">{children}</span>
      {code && (
        <button
          onClick={() => copy(code)}
          aria-label="Copiar"
          className="flex-none text-mist transition-colors hover:text-pine"
        >
          <CopyIcon className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </span>
  );
}

export function Install() {
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

  const pasos = [
    {
      t: "Descarga el plugin",
      d: "Genera el ZIP con los 9 archivos y su README.txt, listo para subir a WordPress.",
      chip: (
        <Snippet>
          <button
            onClick={descargar}
            className="flex items-center gap-2 font-bold text-pine transition-colors hover:text-pine-deep"
          >
            <DownloadIcon className="h-4 w-4" strokeWidth={2.2} />
            {bajando ? "generando…" : "reserva-salas-v1.0.0.zip"}
          </button>
        </Snippet>
      ),
    },
    {
      t: "Súbelo y actívalo",
      d: "Desde el escritorio: Plugins → Añadir nuevo → Subir plugin. La activación crea las tablas y siembra dos salas de ejemplo.",
      chip: (
        <Snippet code="Plugins → Añadir nuevo → Subir plugin → reserva-salas-v1.0.0.zip">
          Plugins → Añadir nuevo → Subir plugin
        </Snippet>
      ),
    },
    {
      t: "Configura tus salas",
      d: "Crea, edita o desactiva salas (nombre, ubicación, capacidad, color) y ajusta horario y franjas en la pestaña Ajustes.",
      chip: <Snippet code="admin.php?page=rs-salas">Escritorio → Salas → Salas / Reservas / Ajustes</Snippet>,
    },
    {
      t: "Inserta el shortcode",
      d: "Colócalo en cualquier página o entrada. Los usuarios con sesión ven el calendario; los invitados, el acceso.",
      chip: <Snippet code={'[reserva_salas titulo="Reserva tu sala"]'}>[reserva_salas titulo="Reserva tu sala"]</Snippet>,
    },
  ];

  return (
    <section id="instalacion" className="relative scroll-mt-16 py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pine">
            02 · Instalación
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            De cero a la primera reserva <span className="ul-brush">en 5 minutos</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_360px]">
          {/* pasos */}
          <ol className="relative space-y-12">
            <span className="step-line absolute bottom-6 left-[22px] top-6 w-px" aria-hidden />
            {pasos.map((p, i) => (
              <Reveal key={p.t} as="li" delay={i * 90} className="relative flex gap-6">
                <span className="hard z-10 grid h-11 w-11 flex-none place-items-center rounded-lg bg-ink font-mono text-sm font-bold text-leaf">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="pt-1">
                  <h3 className="font-display text-lg font-semibold text-ink">{p.t}</h3>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mist">{p.d}</p>
                  {p.chip}
                </div>
              </Reveal>
            ))}
          </ol>

          {/* qué pasa al activar */}
          <Reveal delay={200} className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative rounded-xl bg-ink p-7 text-paper shadow-[0_30px_60px_-25px_rgba(16,31,24,0.55)]">
              <Ticks dark />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-leaf">
                register_activation_hook
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold">Al activar el plugin…</h3>
              <ul className="mt-5 space-y-3.5">
                {[
                  ["dbDelta() crea", "wp_rs_salas y wp_rs_reservas con índices"],
                  ["Siembra", "«Sala Norte» y «Sala Ágora» de ejemplo"],
                  ["Horario", "08:00 – 18:00 con franjas de 30 min"],
                  ["Correo al admin", "activado (editable en Ajustes)"],
                ].map(([k, v]) => (
                  <li key={k} className="flex gap-3">
                    <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-leaf/15 text-leaf">
                      <CheckIcon className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <p className="text-[13.5px] leading-snug text-paper/75">
                      <strong className="text-paper">{k}</strong> — {v}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-paper/10 pt-5">
                <p className="font-mono text-[10.5px] leading-relaxed text-paper/40">
                  # compatible con multisitio
                  <br /># sin tablas si se desactiva: los datos se conservan
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
