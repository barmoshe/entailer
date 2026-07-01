export function Footer() {
  return (
    <footer>
      <div className="wrap row">
        <span className="foot-brand">
          <img className="foot-logo" src={`${import.meta.env.BASE_URL}logo.webp`} width={26} height={26} alt="" aria-hidden="true" />
          entailer — MIT licensed. The engine on this page is the published <code>@entailer/core</code>, running client-side.
        </span>
        <span>
          <a href="https://github.com/barmoshe/entailer">source</a> ·{" "}
          <a href="https://github.com/barmoshe/entailer/blob/main/DESIGN.md">design</a>
        </span>
      </div>
    </footer>
  );
}
