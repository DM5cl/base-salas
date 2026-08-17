import { useMemo } from "react";
import type { Lang } from "../data/pluginFiles";

const KW: Record<Lang, Set<string>> = {
  php: new Set(
    (
      "echo print function fn return if else elseif foreach as for while do switch case break continue " +
      "new class public private protected static var array true false null require require_once include " +
      "define defined exit isset empty unset global namespace use try catch throw const abstract interface " +
      "extends implements match default and or not xor list clone instanceof insteadof"
    ).split(/\s+/)
  ),
  js: new Set(
    (
      "const let var function return if else for while of in new class extends this typeof instanceof " +
      "true false null undefined async await try catch throw switch case break continue default export " +
      "import from delete void yield static get set"
    ).split(/\s+/)
  ),
  css: new Set(
    (
      "important media keyframes supports font-face import charset not hover focus active root flex grid " +
      "auto-fill minmax repeat calc var inherit initial none solid dashed"
    ).split(/\s+/)
  ),
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Envuelve un token en spans, uno por línea, para poder numerar líneas después. */
function wrap(cls: string, text: string): string {
  return text
    .split("\n")
    .map((seg) => '<span class="' + cls + '">' + esc(seg) + "</span>")
    .join("\n");
}

const MASTER =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(#[0-9a-fA-F]{3,8}\b)|(\$[A-Za-z_]\w*)|(<\?php|\?>)|(@[\w-]+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_-]*)/g;

export function highlight(code: string, lang: Lang): string {
  const kw = KW[lang];
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;

  MASTER.lastIndex = 0;
  while ((m = MASTER.exec(code))) {
    out += esc(code.slice(last, m.index));
    const [full, com, str, hex, vari, ptag, at, num, word] = m;

    if (com) out += wrap("tk-com", com);
    else if (str) out += wrap("tk-str", str);
    else if (hex) out += wrap("tk-num", hex);
    else if (vari) out += wrap("tk-var", vari);
    else if (ptag) out += wrap("tk-kw", ptag);
    else if (at) out += wrap("tk-kw", at);
    else if (num) out += wrap("tk-num", num);
    else if (word) {
      const lower = word.toLowerCase();
      if (kw.has(lower)) {
        out += wrap("tk-kw", word);
      } else if (/^[A-Z][A-Z0-9_]{2,}$/.test(word)) {
        out += wrap("tk-const", word);
      } else {
        let i = m.index + word.length;
        while (i < code.length && code[i] === " ") i++;
        if (code[i] === "(") {
          out += wrap("tk-fn", word);
        } else if (lang === "css" && code[i] === ":") {
          out += wrap("tk-prop", word);
        } else {
          out += esc(word);
        }
      }
    }
    last = m.index + full.length;
  }
  out += esc(code.slice(last));
  return out;
}

export function CodeBlock({ code, lang }: { code: string; lang: Lang }) {
  const lines = useMemo(() => highlight(code, lang).split("\n"), [code, lang]);

  return (
    <div className="code-scroll overflow-auto">
      <pre className="font-mono text-[12.5px] leading-[1.75] min-w-max">
        {lines.map((ln, i) => (
          <div className="cl" key={i}>
            <span className="ln select-none">{i + 1}</span>
            <span
              className="lc"
              dangerouslySetInnerHTML={{ __html: ln || "&nbsp;" }}
            />
          </div>
        ))}
      </pre>
    </div>
  );
}
