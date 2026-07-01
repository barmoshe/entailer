import { useHashRoute } from "./router.js";
import { Filters } from "./components/Filters.js";
import { Footer } from "./components/Footer.js";
import { Nav } from "./components/Nav.js";
import { Home } from "./pages/Home.js";
import { Playground } from "./pages/Playground.js";
import { Docs } from "./pages/Docs.js";
import { Math } from "./pages/Math.js";
import { Showcase } from "./pages/Showcase.js";

/* ------------------------------------------------------------------ *
 * App shell. A tiny hash router (see router.tsx) selects the page; the
 * deckle SVG filters, the nav, and the footer are shared chrome. Every
 * exhibit on every page runs the published @entailer/core client-side.
 * ------------------------------------------------------------------ */
export function App() {
  const route = useHashRoute();
  return (
    <>
      <Filters />
      <Nav route={route} />
      {route.page === "playground" ? (
        <Playground anchor={route.anchor} />
      ) : route.page === "docs" ? (
        <Docs />
      ) : route.page === "math" ? (
        <Math />
      ) : route.page === "showcase" ? (
        <Showcase />
      ) : (
        <Home />
      )}
      <Footer />
    </>
  );
}
