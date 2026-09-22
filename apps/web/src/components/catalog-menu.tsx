import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type CatalogMenuLink = {
  label: string;
  to: "/" | "/app" | "/login" | "/signup";
};

/**
 * The catalog's only navigation: a word and three bars, opening a panel of
 * hairline-separated links that invert as you move down them.
 */
export function CatalogMenu({ links }: { links: readonly CatalogMenuLink[] }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-bold text-inherit"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid gap-[3px]" aria-hidden="true">
          <i className="block h-[2px] w-[19px] bg-foreground" />
          <i className={`block h-[2px] w-[19px] bg-foreground ${open ? "opacity-35" : ""}`} />
          <i className="block h-[2px] w-[19px] bg-foreground" />
        </span>
        <span className="group-hover:underline group-hover:underline-offset-[3px]">Menu</span>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+11px)] right-0 z-20 flex min-w-[194px] flex-col border border-border bg-background"
          role="menu"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              role="menuitem"
              className="border-b border-border px-3.5 py-3 text-right text-sm font-bold whitespace-nowrap last:border-b-0 hover:bg-foreground hover:text-background"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
