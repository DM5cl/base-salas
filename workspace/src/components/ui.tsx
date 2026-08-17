import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckIcon } from "./icons";

/* ---------------- toasts ---------------- */

type Listener = (msg: string) => void;
let listeners: Listener[] = [];

export function toast(msg: string) {
  listeners.forEach((l) => l(msg));
}

export function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);

  useEffect(() => {
    const fn: Listener = (msg) => {
      const id = Date.now() + Math.random();
      setItems((p) => [...p.slice(-3), { id, msg }]);
      setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 3000);
    };
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[95] flex flex-col gap-2 items-end">
      {items.map((i) => (
        <div
          key={i.id}
          className="toast-item flex items-center gap-3 rounded-lg border border-leaf/30 bg-ink-3 px-4 py-3 text-sm text-paper shadow-[0_14px_40px_rgba(11,22,17,0.5)]"
        >
          <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-leaf text-ink-3">
            <CheckIcon className="h-3 w-3" strokeWidth={3} />
          </span>
          <span className="font-medium">{i.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- reveal on scroll ---------------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={"rv " + className + (inView ? " rv-in" : "")}
      style={{ transitionDelay: delay + "ms" }}
    >
      {children}
    </Tag>
  );
}

/* ---------------- copiar ---------------- */

export function useCopy() {
  return async (text: string, msg = "Copiado al portapapeles") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(msg);
  };
}

/* ---------------- esquinas tipo plano ---------------- */

export function Ticks({ dark = false }: { dark?: boolean }) {
  const c = dark ? "tick-dark" : "";
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((p) => (
        <i key={p} aria-hidden className={"tick tick-" + p + " " + c} />
      ))}
    </>
  );
}
