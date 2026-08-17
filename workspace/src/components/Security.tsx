import { ReactNode } from "react";
import { Reveal, Ticks } from "./ui";
import {
  CodeIcon,
  DbIcon,
  FunnelIcon,
  KeyIcon,
  LockIcon,
  ShieldIcon,
} from "./icons";

const ITEMS: { icon: ReactNode; t: string; d: string; code: string }[] = [
  {
    icon: <ShieldIcon className="h-5 w-5" />,
    t: "Nonce en cada request",
    d: "El JS envía X-WP-Nonce: wp_rest y WordPress lo verifica antes de ejecutar el endpoint.",
    code: "wp_create_nonce('wp_rest')",
  },
  {
    icon: <LockIcon className="h-5 w-5" />,
    t: "Permisos explícitos",
    d: "Cada ruta declara permission_callback: reservar exige sesión; administrar exige manage_options.",
    code: "is_user_logged_in()",
  },
  {
    icon: <DbIcon className="h-5 w-5" />,
    t: "Consultas preparadas",
    d: "Todas las queries pasan por placeholders %d y %s: ningún dato del cliente se concatena.",
    code: "$wpdb->prepare( …, %d, %s )",
  },
  {
    icon: <FunnelIcon className="h-5 w-5" />,
    t: "Entrada saneada",
    d: "Fechas y horas se validan con expresiones regulares; el resto, con sanitize_text_field() y absint().",
    code: "'/^([01]\\d|2[0-3]):[0-5]\\d$/'",
  },
  {
    icon: <CodeIcon className="h-5 w-5" />,
    t: "Salida escapada",
    d: "El HTML del widget y los correos escapan todo dato dinámico antes de imprimirlo.",
    code: "esc_html() · esc_attr() · esc_url()",
  },
  {
    icon: <KeyIcon className="h-5 w-5" />,
    t: "Dueño o administrador",
    d: "Una reserva solo puede cancelarla quien la creó o un administrador; el resto recibe 403.",
    code: "current_user_can('manage_options')",
  },
];

export function Security() {
  return (
    <section id="seguridad" className="relative scroll-mt-16 py-24">
      <div className="dotgrid absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pine">
            04 · Seguridad
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Cada request pasa por el filtro
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mist">
            El plugin sigue las prácticas del handbook de WordPress: nunca confía en el
            navegador y repite toda validación en el servidor.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it, i) => (
            <Reveal key={it.t} delay={(i % 3) * 100}>
              <article className="group relative h-full rounded-xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-pine/50 hover:shadow-[0_22px_45px_-20px_rgba(31,122,77,0.35)]">
                <Ticks />
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-pine/10 text-pine transition-colors duration-300 group-hover:bg-pine group-hover:text-white">
                  {it.icon}
                </span>
                <h3 className="mt-4 text-[15.5px] font-bold text-ink">{it.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-mist">{it.d}</p>
                <code className="mt-4 block truncate rounded-md bg-ink-3 px-3 py-2 font-mono text-[11px] text-leaf">
                  {it.code}
                </code>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
