/* ------------------------------------------------------------------ *
 * A tiny zero-dependency hash router. GitHub Pages is a static host
 * served under base "/entailer/" with no server rewrites, so a
 * history-API router would 404 on refresh/deep-link. Hash routing
 * (/entailer/#/docs) is handled entirely client-side — no 404.html.
 *
 * A hash is treated as a *route* only when it starts with "#/". The
 * segment after "#/" is the page; an optional trailing "#anchor" is a
 * scroll target (so "#/#playground" = Home + scroll to "playground").
 * A bare "#playground" is left alone for native anchor scrolling.
 * ------------------------------------------------------------------ */
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export type Page = "home" | "docs" | "math" | "showcase";

export interface Route {
  readonly page: Page;
  /** An in-page element id to scroll to on mount, if any. */
  readonly anchor: string | null;
}

const PAGES: readonly Page[] = ["home", "docs", "math", "showcase"];

/** Parse `location.hash` into a route. Non-route hashes resolve to Home. */
export const parseHash = (hash: string): Route => {
  if (!hash.startsWith("#/")) return { page: "home", anchor: null };
  const rest = hash.slice(2); // drop "#/"
  const [seg, anchor] = rest.split("#");
  const first = seg.split("/")[0] ?? "";
  const page = (PAGES as readonly string[]).includes(first) && first !== ""
    ? (first as Page)
    : "home";
  return { page, anchor: anchor && anchor.length > 0 ? anchor : null };
};

/** Reactive current-route hook, driven by the browser `hashchange` event. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  // Scroll discipline: honor an anchor if present, else jump to top so a new
  // page never inherits the previous page's scroll position.
  useEffect(() => {
    if (route.anchor) {
      // Wait a frame so the target page has mounted before scrolling.
      const id = route.anchor;
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [route.page, route.anchor]);

  return route;
}

/** A hash link. Same-page anchors on Home use `#/#anchor`; pages use `#/page`. */
export function Link({
  to,
  anchor,
  className,
  children,
  onNavigate,
}: {
  to: Page;
  anchor?: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const seg = to === "home" ? "" : to;
  const href = `#/${seg}${anchor ? `#${anchor}` : ""}`;
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    // If the hash is unchanged the browser fires no hashchange; force the
    // scroll/route side-effects anyway (e.g. re-clicking the active page).
    if (window.location.hash === href) {
      e.preventDefault();
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    onNavigate?.();
  };
  return (
    <a href={href} className={className} onClick={handle}>
      {children}
    </a>
  );
}
