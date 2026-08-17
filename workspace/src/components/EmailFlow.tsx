import { useState } from "react";
import { EmailMock } from "./EmailMock";
import { Reveal, Ticks } from "./ui";

const PASOS = [
  {
    t: "El usuario elige sala y franja",
    d: "El widget pinta salas y disponibilidad desde la API y valida el rango en el navegador.",
    tag: "assets/js/reserva-salas.js",
    cancel: false,
  },
  {
    t: "POST con nonce de sesión",
    d: "fetch envía la cabecera X-WP-Nonce generada con wp_create_nonce('wp_rest'); WordPress la verifica.",
    tag: "X-WP-Nonce: wp_rest",
    cancel: false,
  },
  {
    t: "Permiso obligatorio",
    d: "permission_callback exige sesión iniciada. Sin usuario de WordPress no hay reserva: 401.",
    tag: "is_user_logged_in()",
    cancel: false,
  },
  {
    t: "Doble check de conflicto",
    d: "En servidor se vuelve a comprobar el solapamiento con consulta preparada. Si se ocupó: 409.",
    tag: "hora_inicio < fin AND hora_fin > inicio",
    cancel: false,
  },
  {
    t: "INSERT y wp_mail()",
    d: "Se guarda en wp_rs_reservas y sale el correo HTML al usuario (y al admin, si está activado).",
    tag: "wp_mail( $para, $asunto, $cuerpo )",
    cancel: false,
  },
  {
    t: "Confirmación… y cancelación",
    d: "El widget confirma en pantalla. Desde «Mis reservas» el dueño puede cancelar: la franja se libera y sale un segundo correo.",
    tag: "estado = 'cancelada'",
    cancel: true,
  },
];

const FECHA = "jueves, 12 de marzo de 2026";

export function EmailFlow() {
  const [sel, setSel] = useState(4);
  const esCancel = PASOS[sel].cancel;

  return (
    <section id="correo" className="grid-dark relative scroll-mt-16 bg-ink-2 py-24 text-paper">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-amber">
            03 · El correo
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Del clic al buzón en seis pasos
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-paper/60">
            Cada reserva dispara <code className="font-mono text-amber">wp_mail()</code> con una
            plantilla HTML de estilos en línea, pensada para Gmail y Outlook. Toca cada paso para
            ver qué ocurre; el último muestra la variante de cancelación.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_430px]">
          {/* pasos */}
          <div className="space-y-3">
            {PASOS.map((p, i) => (
              <Reveal key={p.t} delay={i * 70}>
                <button
                  onClick={() => setSel(i)}
                  className={
                    "w-full rounded-xl border p-4 text-left transition-all duration-200 sm:p-5 " +
                    (i === sel
                      ? "border-leaf/60 bg-leaf/[0.07] shadow-[0_10px_35px_-15px_rgba(62,207,142,0.25)]"
                      : "border-paper/12 hover:border-paper/30 hover:bg-paper/[0.03]")
                  }
                >
                  <span className="flex items-start gap-4">
                    <span
                      className={
                        "mt-0.5 font-mono text-[12px] font-bold " +
                        (i === sel ? "text-leaf" : "text-paper/35")
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-paper">{p.t}</span>
                      <span className="mt-1 block text-[13.5px] leading-relaxed text-paper/55">
                        {p.d}
                      </span>
                      <code
                        className={
                          "mt-2.5 inline-block rounded px-2 py-1 font-mono text-[11px] " +
                          (p.cancel
                            ? "bg-coral/15 text-[#ff9d80]"
                            : "bg-leaf/12 text-leaf")
                        }
                      >
                        {p.tag}
                      </code>
                    </span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>

          {/* vista previa del correo */}
          <Reveal delay={200} className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative">
              <Ticks dark />
              <div key={sel} className="toast-item">
                <EmailMock
                  chrome
                  color={esCancel ? "#e4572e" : "#1f7a4d"}
                  titulo={esCancel ? "Reserva cancelada" : "Reserva confirmada"}
                  intro={
                    esCancel
                      ? "La siguiente reserva quedó cancelada y la franja vuelve a estar libre:"
                      : "Hola, María. Tu sala quedó agendada:"
                  }
                  sala="Sala Ágora"
                  ubicacion="Piso 1 · Junto a recepción"
                  fechaLarga={FECHA}
                  horas="10:00 – 11:30"
                  reunion="Roadmap Q2"
                  usuario="María López"
                  email="maria@estudio.mx"
                />
              </div>
              <p className="mt-4 text-center font-mono text-[11px] text-paper/40">
                {esCancel
                  ? "variante de cancelación · solo para el dueño de la reserva"
                  : "así llega al buzón · destinatarios: usuario" +
                    " + admin (opcional)"}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
