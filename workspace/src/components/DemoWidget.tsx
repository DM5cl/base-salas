import { FormEvent, useMemo, useState } from "react";
import { EmailMock } from "./EmailMock";
import { toast } from "./ui";
import { CheckIcon, LockIcon, MailIcon, UserIcon } from "./icons";

interface Reserva {
  id: number;
  salaId: number;
  sala: string;
  ubicacion: string;
  color: string;
  fecha: string;
  inicio: number;
  dur: number;
  titulo: string;
  estado: "confirmada" | "cancelada";
}

const SALAS = [
  { id: 1, nombre: "Sala Norte", capacidad: 8, ubicacion: "Piso 2 · Edif. A", color: "#1f7a4d" },
  { id: 2, nombre: "Sala Ágora", capacidad: 12, ubicacion: "Piso 1 · Recepción", color: "#e4572e" },
  { id: 3, nombre: "Sala Foco", capacidad: 4, ubicacion: "Piso 3 · Ala norte", color: "#f2a33c" },
];

const INI = 8 * 60;
const FIN = 18 * 60;
const STEP = 30;

function isoHoy(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function isoManana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
const HOY = isoHoy();

function aHora(min: number): string {
  return (
    String(Math.floor(min / 60)).padStart(2, "0") +
    ":" +
    String(min % 60).padStart(2, "0")
  );
}
function fmtCorta(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function fmtLarga(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function hashNum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const SEMILLA: Reserva = {
  id: 1,
  salaId: 1,
  sala: "Sala Norte",
  ubicacion: "Piso 2 · Edif. A",
  color: "#1f7a4d",
  fecha: isoManana(),
  inicio: 9 * 60 + 30,
  dur: 60,
  titulo: "Daily del equipo",
  estado: "confirmada",
};

const OCUPADA_BG =
  "repeating-linear-gradient(-45deg,#f2f5f2,#f2f5f2 5px,#e7ece7 5px,#e7ece7 10px)";

export function DemoWidget() {
  const [invitado, setInvitado] = useState(false);
  const [tab, setTab] = useState<"nueva" | "mia">("nueva");
  const [salaId, setSalaId] = useState(1);
  const [fecha, setFecha] = useState(HOY);
  const [dur, setDur] = useState(60);
  const [inicio, setInicio] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState<Reserva | null>(null);
  const [verCorreo, setVerCorreo] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [reservas, setReservas] = useState<Reserva[]>([SEMILLA]);

  const sala = SALAS.find((s) => s.id === salaId)!;
  const activas = useMemo(
    () => reservas.filter((r) => r.estado === "confirmada").length,
    [reservas]
  );

  const ahoraMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  function estadoFranja(min: number): "pasada" | "ocupada" | "libre" | "mia" {
    if (fecha === HOY && min < ahoraMin) return "pasada";
    const enReserva = reservas.some(
      (r) =>
        r.estado === "confirmada" &&
        r.salaId === salaId &&
        r.fecha === fecha &&
        min >= r.inicio &&
        min < r.inicio + r.dur
    );
    if (enReserva) return "ocupada";
    if (hashNum(salaId + "|" + fecha + "|" + min) % 100 < 30) return "ocupada";
    if (inicio !== null && min >= inicio && min < inicio + dur) return "mia";
    return "libre";
  }

  function chocando(min: number): boolean {
    for (let m = min; m < min + dur; m += STEP) {
      const e = estadoFranja(m);
      if (e === "ocupada" || e === "pasada" || m >= FIN) return true;
    }
    return false;
  }

  function elegirFranja(min: number) {
    if (chocando(min)) {
      setError("La franja de las " + aHora(min) + " choca con otra reserva.");
      setShakeKey((k) => k + 1);
      return;
    }
    setInicio(min);
    setError("");
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (inicio === null) {
      setError("Elige una franja libre antes de confirmar.");
      setShakeKey((k) => k + 1);
      return;
    }
    if (!titulo.trim()) {
      setError("Escribe un título para la reunión.");
      setShakeKey((k) => k + 1);
      return;
    }
    setEnviando(true);
    setError("");
    setTimeout(() => {
      const r: Reserva = {
        id: Date.now(),
        salaId,
        sala: sala.nombre,
        ubicacion: sala.ubicacion,
        color: sala.color,
        fecha,
        inicio,
        dur,
        titulo: titulo.trim(),
        estado: "confirmada",
      };
      setReservas((p) => [...p, r].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio));
      setExito(r);
      setVerCorreo(false);
      setEnviando(false);
      setInicio(null);
      setTitulo("");
      toast("Reserva confirmada · wp_mail() enviado");
    }, 900);
  }

  function cancelar(id: number) {
    setReservas((p) =>
      p.map((r) => (r.id === id ? { ...r, estado: "cancelada" as const } : r))
    );
    toast("Reserva cancelada · franja liberada");
  }

  function alternarInvitado() {
    setInvitado((v) => !v);
    setExito(null);
    setTab("nueva");
    toast(invitado ? "Sesión restaurada: María López" : "Viendo el widget como invitado");
  }

  const slots: number[] = [];
  for (let m = INI; m < FIN; m += STEP) slots.push(m);

  const resumen =
    inicio !== null
      ? sala.nombre + " · " + fmtCorta(fecha) + " · " + aHora(inicio) + " – " + aHora(inicio + dur)
      : "Selecciona una franja libre.";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_35px_80px_-24px_rgba(16,31,24,0.45)]">
      {/* barra tipo navegador */}
      <div className="flex items-center gap-2 border-b border-ink-2 bg-ink-3 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-coral/90" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber/90" />
        <span className="h-2.5 w-2.5 rounded-full bg-leaf/90" />
        <span className="ml-3 hidden truncate font-mono text-[10.5px] text-paper/55 sm:block">
          tudominio.mx/agendar · [reserva_salas]
        </span>
        <span className="ml-auto flex flex-none items-center gap-1.5 font-mono text-[10px] tracking-widest text-leaf">
          <span className="live-dot h-2 w-2 rounded-full bg-leaf" />
          DEMO EN VIVO
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {/* cabecera del widget */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Reservar sala</h3>
            <p className="mt-0.5 text-[12.5px] text-mist">
              Elige sala, día y franja. Recibirás un correo de confirmación.
            </p>
          </div>
          {!invitado && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-pine font-bold text-white">
                M
              </span>
              <span className="leading-tight">
                <strong className="block text-[13px] text-ink">María López</strong>
                <small className="text-[11px] text-mist">maria@estudio.mx</small>
              </span>
            </div>
          )}
        </div>

        {invitado ? (
          /* ------- sin sesión: lo que ve un invitado en WordPress ------- */
          <div className="my-6 rounded-xl border-2 border-dashed border-line bg-paper px-6 py-8 text-center">
            <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-ink text-leaf">
              <LockIcon className="h-5 w-5" />
            </span>
            <p className="font-semibold text-ink">Inicia sesión para reservar una sala.</p>
            <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-mist">
              El shortcode detecta que no hay sesión y muestra el acceso en lugar del calendario.
            </p>
            <button
              onClick={alternarInvitado}
              className="hard hs-leaf mx-auto mt-4 flex items-center gap-2 rounded-lg bg-pine px-5 py-2.5 text-sm font-bold text-white"
            >
              <UserIcon className="h-4 w-4" /> Ir al acceso
            </button>
            <p className="mt-4 font-mono text-[10.5px] text-mist">
              wp_login_url( get_permalink() )
            </p>
          </div>
        ) : (
          <>
            {/* pestañas */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setTab("nueva")}
                className={
                  "rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all " +
                  (tab === "nueva"
                    ? "border-ink bg-ink text-white"
                    : "border-line text-mist hover:border-pine hover:text-pine")
                }
              >
                Nueva reserva
              </button>
              <button
                onClick={() => setTab("mia")}
                className={
                  "flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all " +
                  (tab === "mia"
                    ? "border-ink bg-ink text-white"
                    : "border-line text-mist hover:border-pine hover:text-pine")
                }
              >
                Mis reservas
                <span
                  className={
                    "grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] " +
                    (tab === "mia" ? "bg-leaf text-ink" : "bg-paper-2 text-mist")
                  }
                >
                  {activas}
                </span>
              </button>
            </div>

            {/* ---------------- pestaña: nueva reserva ---------------- */}
            {tab === "nueva" &&
              (exito ? (
                <div className="pt-6 text-center">
                  <span className="pop-ring mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-pine bg-pine/10">
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="var(--color-pine)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path className="draw-check" d="m5 12.5 4.5 4.5L19 7" />
                    </svg>
                  </span>
                  <h4 className="mt-3 font-display text-base font-semibold text-ink">
                    ¡Reserva confirmada!
                  </h4>
                  <div className="mx-auto mt-4 max-w-sm rounded-lg border border-line bg-paper text-left">
                    {[
                      ["Sala", exito.sala + " · " + exito.ubicacion],
                      ["Fecha", fmtLarga(exito.fecha)],
                      ["Hora", aHora(exito.inicio) + " – " + aHora(exito.inicio + exito.dur)],
                      ["Reunión", exito.titulo],
                    ].map(([k, v], i) => (
                      <div key={k} className={"flex gap-3 px-4 py-2 text-[12.5px] " + (i < 3 ? "border-b border-line" : "")}>
                        <span className="w-16 flex-none font-bold text-ink">{k}</span>
                        <span className="text-ink/75">{v}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mx-auto mt-4 flex w-max max-w-full items-center gap-2 rounded-full border border-pine/30 bg-pine/10 px-4 py-1.5 text-[12px] font-semibold text-pine">
                    <MailIcon className="h-4 w-4 flex-none" />
                    <span className="truncate">Confirmación enviada a maria@estudio.mx</span>
                  </p>

                  {verCorreo && (
                    <div className="mx-auto mt-4 max-w-md">
                      <EmailMock
                        color={exito.color}
                        titulo="Reserva confirmada"
                        intro={"Hola, María. Tu sala quedó agendada:"}
                        sala={exito.sala}
                        ubicacion={exito.ubicacion}
                        fechaLarga={fmtLarga(exito.fecha)}
                        horas={aHora(exito.inicio) + " – " + aHora(exito.inicio + exito.dur)}
                        reunion={exito.titulo}
                        usuario="María López"
                        email="maria@estudio.mx"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => { setExito(null); setVerCorreo(false); }}
                      className="hard hs-leaf rounded-lg bg-ink px-4 py-2 text-[13px] font-bold text-paper"
                    >
                      Hacer otra reserva
                    </button>
                    <button
                      onClick={() => setVerCorreo((v) => !v)}
                      className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-mist transition-colors hover:border-pine hover:text-pine"
                    >
                      {verCorreo ? "Ocultar correo" : "Ver el correo"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={enviar} className="mt-5">
                  {/* salas */}
                  <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist">
                    1 · Sala
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {SALAS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSalaId(s.id); setInicio(null); setError(""); }}
                        className={
                          "relative rounded-lg border p-3 text-left transition-all duration-200 " +
                          (salaId === s.id
                            ? "border-pine bg-[#e8f4ed] shadow-[inset_0_0_0_1px_var(--color-pine)]"
                            : "border-line bg-white hover:-translate-y-0.5 hover:border-pine")
                        }
                      >
                        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="block text-[13px] font-bold text-ink">{s.nombre}</span>
                        <small className="text-[11px] text-mist">
                          {s.capacidad} pers · {s.ubicacion}
                        </small>
                      </button>
                    ))}
                  </div>

                  {/* fecha + duración */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist">
                        2 · Día
                      </span>
                      <input
                        type="date"
                        value={fecha}
                        min={HOY}
                        onChange={(e) => { setFecha(e.target.value); setInicio(null); setError(""); }}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-pine focus:ring-[3px] focus:ring-pine/15"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist">
                        Duración
                      </span>
                      <select
                        value={dur}
                        onChange={(e) => { setDur(Number(e.target.value)); setInicio(null); setError(""); }}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-pine focus:ring-[3px] focus:ring-pine/15"
                      >
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={90}>1 h 30 min</option>
                        <option value={120}>2 horas</option>
                      </select>
                    </label>
                  </div>

                  {/* franjas */}
                  <p className="mb-2 mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist">
                    3 · Franja horaria <span className="normal-case tracking-normal">· {fmtCorta(fecha)}</span>
                  </p>
                  <div key={shakeKey} className={"grid grid-cols-4 gap-1.5 sm:grid-cols-5 " + (error && shakeKey ? "shake" : "")}>
                    {slots.map((m) => {
                      const e = estadoFranja(m);
                      const sel = e === "mia";
                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={e === "ocupada" || e === "pasada"}
                          onClick={() => elegirFranja(m)}
                          title={e === "ocupada" ? "Franja ocupada" : e === "pasada" ? "Hora pasada" : "Franja libre"}
                          className={
                            "rounded-md border px-1 py-2 font-mono text-[11.5px] tabular-nums transition-all duration-150 " +
                            (sel
                              ? "border-pine bg-pine font-bold text-white"
                              : e === "libre"
                              ? "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-pine hover:text-pine"
                              : e === "pasada"
                              ? "cursor-not-allowed border-line/60 text-mist/40"
                              : "cursor-not-allowed border-line/70 text-[#a7b5ab] line-through")
                          }
                          style={
                            e === "ocupada"
                              ? { backgroundImage: OCUPADA_BG }
                              : e === "pasada"
                              ? { opacity: 0.45 }
                              : undefined
                          }
                        >
                          {aHora(m)}
                        </button>
                      );
                    })}
                  </div>

                  {/* título */}
                  <label className="mt-4 block">
                    <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist">
                      4 · Título de la reunión
                    </span>
                    <input
                      type="text"
                      value={titulo}
                      maxLength={120}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej. Revisión de proyecto"
                      className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-pine focus:ring-[3px] focus:ring-pine/15"
                    />
                  </label>

                  {/* acciones */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className={"text-[12.5px] font-semibold " + (inicio !== null ? "text-ink" : "text-mist")}>
                      {resumen}
                    </p>
                    <button
                      type="submit"
                      disabled={enviando}
                      className="hard hs-ink rounded-lg bg-pine px-5 py-2.5 text-[13px] font-bold text-white disabled:cursor-wait disabled:opacity-70"
                    >
                      {enviando ? "Guardando…" : "Confirmar reserva"}
                    </button>
                  </div>

                  <p className={"min-h-[1.2em] pt-2.5 text-[12.5px] font-semibold " + (error ? "text-coral" : "text-pine")}>
                    {error}
                  </p>
                </form>
              ))}

            {/* ---------------- pestaña: mis reservas ---------------- */}
            {tab === "mia" && (
              <div className="mt-5 space-y-2.5">
                {reservas.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-mist">
                    Todavía no tienes reservas próximas.
                  </p>
                )}
                {reservas.map((r) => (
                  <article
                    key={r.id}
                    className={
                      "flex items-center justify-between gap-3 rounded-lg border p-3.5 transition-colors " +
                      (r.estado === "confirmada" ? "border-line bg-white" : "border-line/70 bg-paper opacity-75")
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-8 w-1.5 flex-none rounded-full" style={{ background: r.color }} />
                      <div className="min-w-0">
                        <strong className="block truncate text-[13.5px] text-ink">{r.titulo}</strong>
                        <small className="text-[11.5px] text-mist">
                          {r.sala} · {fmtCorta(r.fecha)} · {aHora(r.inicio)} – {aHora(r.inicio + r.dur)}
                        </small>
                      </div>
                    </div>
                    {r.estado === "confirmada" ? (
                      <button
                        onClick={() => cancelar(r.id)}
                        className="flex-none rounded-md border border-coral px-3 py-1.5 text-[12px] font-bold text-coral transition-colors hover:bg-coral hover:text-white"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <span className="flex-none rounded-full border border-coral px-3 py-1 text-[11px] font-bold text-coral">
                        Cancelada
                      </span>
                    )}
                  </article>
                ))}
                <p className="flex items-center gap-2 pt-1 font-mono text-[10.5px] text-mist">
                  <CheckIcon className="h-3.5 w-3.5 text-pine" strokeWidth={2.4} />
                  Cancelar libera la franja y envía un segundo correo.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* pie del widget */}
      <div className="flex items-center justify-between gap-3 border-t border-line bg-paper px-5 py-2.5">
        <span className="truncate font-mono text-[10.5px] text-mist">
          {invitado ? "is_user_logged_in() → false" : "wp_get_current_user() → María López"}
        </span>
        <button
          onClick={alternarInvitado}
          className="flex-none font-mono text-[10.5px] font-bold text-pine underline decoration-pine/40 underline-offset-4 transition-colors hover:text-pine-deep"
        >
          {invitado ? "restaurar sesión" : "simular invitado"}
        </button>
      </div>
    </div>
  );
}
