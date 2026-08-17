import JSZip from "jszip";
import { PLUGIN_FILES, PLUGIN_SLUG, PLUGIN_VERSION } from "../data/pluginFiles";

/** Genera el .zip del plugin en el navegador y lanza la descarga. */
export async function descargarPlugin(): Promise<void> {
  const zip = new JSZip();
  const raiz = zip.folder(PLUGIN_SLUG);

  PLUGIN_FILES.forEach((f) => {
    raiz?.file(f.path, f.code);
  });

  raiz?.file(
    "README.txt",
    [
      "=== Reserva Salas ===",
      "Contributors: estudioandamio",
      "Tags: salas, reuniones, reservas, booking",
      "Requires at least: 6.0",
      "Requires PHP: 7.4",
      "Stable tag: " + PLUGIN_VERSION,
      "License: GPL-2.0-or-later",
      "",
      "== Descripcion ==",
      "Agenda salas de reunion usando los usuarios de WordPress.",
      "Incluye control de disponibilidad por franjas, API REST propia",
      "y correos de confirmacion/cancelacion con wp_mail().",
      "",
      "== Instalacion ==",
      "1. Sube la carpeta a /wp-content/plugins/ (o usa el ZIP).",
      "2. Activa el plugin: se crean las tablas y dos salas de ejemplo.",
      "3. Gestiona salas en Escritorio > Salas.",
      "4. Inserta el shortcode [reserva_salas] en cualquier pagina.",
    ].join("\n")
  );

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 7 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = PLUGIN_SLUG + "-v" + PLUGIN_VERSION + ".zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
