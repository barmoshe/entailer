import { Link, type Page, type Route } from "../router.js";

const ITEMS: { to: Page; label: string }[] = [
  { to: "home", label: "Home" },
  { to: "playground", label: "Playground" },
  { to: "docs", label: "Docs" },
  { to: "math", label: "The Mathematics" },
  { to: "showcase", label: "Showcase" },
];

/** Top navigation. A hash <Link> per page; the active route gets `.on`. */
export function Nav({ route }: { route: Route }) {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <Link to="home" className="nav-brand">
          <img src={`${import.meta.env.BASE_URL}logo.webp`} width={28} height={28} alt="" aria-hidden="true" />
          <span>entail<em>er</em></span>
        </Link>
        <div className="nav-links">
          {ITEMS.map((it) => (
            <Link key={it.to} to={it.to} className={route.page === it.to ? "on" : ""}>
              {it.label}
            </Link>
          ))}
          <a className="nav-ext" href="https://github.com/barmoshe/entailer">GitHub</a>
        </div>
      </div>
    </nav>
  );
}
