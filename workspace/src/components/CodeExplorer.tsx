import { useMemo, useState, type CSSProperties } from "react";
import { PLUGIN_FILES, totalLineas, type PluginFile } from "../data/pluginFiles";
import { CodeBlock } from "../lib/highlight";
import { Reveal, Ticks, toast, useCopy } from "./ui";
import { CopyIcon, DownloadIcon, FileIcon } from "./icons";
import { descargarPlugin } from "../lib/zip";

const LANG_COLOR: Record<string, string> = {
  php: "#7fd6a8",
  js: "#f5c66d",
  css: "#f0916b",
};

function folderDe(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "reserva-salas/" : "reserva-salas/" + path.slice(0, i + 1);
}

export function CodeExplorer() {
  const [sel, setSel] = useState(0);
  const copy = useCopy();
  const file: PluginFile = PLUGIN_FILES[sel];

  const grupos = useMemo(() => {
    const map = new Map<string, { file: PluginFile; idx: number }[]>();
    PLUGIN_FILES.forEach((f, idx) => {
      const folder = folderDe(f.path);
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push({ file: f, idx });
    });
    return Array.from(map.entries());
  }, []);

  const descargarUno = (f: PluginFile) => {
    const blob = new Blob([f.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.path.split("/").pop()!;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast(f.path + " descargado");
  };

  return (
    <section id="codigo" className="grid-dark relative scroll-mt-16 bg-ink-3 py-24 text-paper">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-leaf">
              01 · El código
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              El plugin, archivo por archivo
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-paper/60">
              Nueve archivos con el patrón clásico de WordPress: clases con
              prefijo <code className="font-mono text-leaf">RS_</code>, ganchos,
              API REST y assets encolados. Todo el código es el que va dentro del ZIP.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex items-center gap-6">
              <p className="text-right font-mono text-[11.5px] leading-relaxed text-paper/45">
                {PLUGIN_FILES.length} archivos
                <br />
                {totalLineas} líneas · 0 dependencias
              </p>
              <button
                onClick={() => { descargarPlugin(); toast("reserva-salas-v1.0.0.zip generado"); }}
                className="hard flex items-center gap-2 rounded-lg bg-leaf px-5 py-3 text-sm font-bold text-ink-3"
                style={{ "--hs": "#14532f" } as React.CSSProperties}
              >
                <DownloadIcon className="h-4 w-4" strokeWidth={2.2} />
                Descargar todo
              </button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={150} className="mt-12">
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            {/* ------- árbol de archivos ------- */}
            <aside className="relative rounded-xl border border-leaf/15 bg-ink-2 p-4 lg:sticky lg:top-24 lg:self-start">
              <Ticks dark />
              {grupos.map(([folder, files]) => (
                <div key={folder} className="mb-4 last:mb-0">
                  <p className="mb-1.5 px-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-paper/35">
                    {folder}
                  </p>
                  <ul className="space-y-0.5">
                    {files.map(({ file: f, idx }) => (
                      <li key={f.path}>
                        <button
                          onClick={() => setSel(idx)}
                          className={
                            "flex w-full items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-left font-mono text-[12.5px] transition-all " +
                            (idx === sel
                              ? "border-leaf bg-leaf/10 text-leaf"
                              : "border-transparent text-paper/65 hover:bg-paper/5 hover:text-paper")
                          }
                        >
                          <FileIcon className="h-3.5 w-3.5 flex-none" style={{ color: LANG_COLOR[f.lang] }} />
                          <span className="truncate">{f.path.split("/").pop()}</span>
                          <span className="ml-auto flex-none text-[10px] text-paper/30">
                            {f.code.split("\n").length}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </aside>

            {/* ------- visor ------- */}
            <div className="relative overflow-hidden rounded-xl border border-leaf/15 bg-[#0d1a13]">
              <Ticks dark />
              <div className="flex flex-wrap items-center gap-3 border-b border-leaf/12 bg-ink-2 px-4 py-3">
                <span className="font-mono text-[12.5px] font-bold text-leaf">{file.path}</span>
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: LANG_COLOR[file.lang],
                    background: LANG_COLOR[file.lang] + "1f",
                  }}
                >
                  {file.lang}
                </span>
                <span className="font-mono text-[11px] text-paper/35">
                  {file.code.split("\n").length} líneas
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => descargarUno(file)}
                    className="flex items-center gap-1.5 rounded-md border border-paper/20 px-3 py-1.5 font-mono text-[11px] text-paper/70 transition-colors hover:border-leaf hover:text-leaf"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" strokeWidth={2} />
                    archivo
                  </button>
                  <button
                    onClick={() => copy(file.code, file.path + " copiado")}
                    className="flex items-center gap-1.5 rounded-md border border-paper/20 px-3 py-1.5 font-mono text-[11px] text-paper/70 transition-colors hover:border-leaf hover:text-leaf"
                  >
                    <CopyIcon className="h-3.5 w-3.5" strokeWidth={2} />
                    copiar
                  </button>
                </span>
              </div>

              <div className="max-h-[540px] min-h-[380px] overflow-auto bg-[#0d1a13] py-3">
                <CodeBlock key={file.path} code={file.code} lang={file.lang} />
              </div>

              <div className="border-t border-leaf/12 bg-ink-2 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-paper/55">
                  <span className="mr-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-amber">
                    qué hace
                  </span>
                  {file.desc}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
