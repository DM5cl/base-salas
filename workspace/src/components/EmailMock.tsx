interface Props {
  color: string;
  titulo: string;
  intro: string;
  sala: string;
  ubicacion: string;
  fechaLarga: string;
  horas: string;
  reunion: string;
  usuario: string;
  email: string;
  sitio?: string;
  chrome?: boolean;
  className?: string;
}

const FILAS: { k: string; v: (p: Props) => string }[] = [
  { k: "Sala", v: (p) => p.sala + " · " + p.ubicacion },
  { k: "Fecha", v: (p) => p.fechaLarga },
  { k: "Hora", v: (p) => p.horas },
  { k: "Reunión", v: (p) => p.reunion },
  { k: "Reservada por", v: (p) => p.usuario + " (" + p.email + ")" },
];

/** Réplica visual del correo HTML que envía wp_mail() en el plugin. */
export function EmailMock(p: Props) {
  const sitio = p.sitio ?? "Tu Empresa S.L.";
  return (
    <div
      className={
        "overflow-hidden rounded-xl border border-line bg-white text-left shadow-[0_18px_50px_-18px_rgba(16,31,24,0.35)] " +
        (p.className ?? "")
      }
    >
      {p.chrome && (
        <div className="space-y-1 border-b border-line bg-paper px-4 py-3 font-mono text-[10.5px] leading-relaxed text-mist">
          <p>
            <span className="text-ink/50">De:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            wordpress@tudominio.mx
          </p>
          <p>
            <span className="text-ink/50">Para:&nbsp;&nbsp;&nbsp;</span>
            {p.email}
          </p>
          <p className="truncate text-ink">
            <span className="text-ink/50">Asunto:&nbsp;</span>
            <strong>
              [{sitio}] {p.titulo} · {p.sala} · {p.fechaLarga} {p.horas.split("–")[0].trim()}
            </strong>
          </p>
        </div>
      )}

      <div className="bg-[#f2f5f2] p-4 sm:p-5">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="px-5 py-4" style={{ background: p.color }}>
            <h4 className="text-[15px] font-bold text-white">{p.titulo}</h4>
            <p className="mt-0.5 text-[11.5px] text-white/80">{sitio}</p>
          </div>
          <p className="px-5 pt-4 text-[12.5px] text-ink">{p.intro}</p>
          <div className="mx-5 my-3 overflow-hidden rounded-md border border-line">
            {FILAS.map((f, i) => (
              <div
                key={f.k}
                className={
                  "flex gap-3 px-4 py-2.5 text-[12px] " +
                  (i < FILAS.length - 1 ? "border-b border-line" : "")
                }
              >
                <span className="w-24 flex-none font-bold text-ink">{f.k}</span>
                <span className="text-ink/80">{f.v(p)}</span>
              </div>
            ))}
          </div>
          <p className="px-5 pb-4 text-[10.5px] leading-relaxed text-mist">
            Recibiste este correo porque tienes cuenta en {sitio}. Puedes cancelar
            desde la pestaña «Mis reservas» del sitio.
          </p>
        </div>
      </div>
    </div>
  );
}
