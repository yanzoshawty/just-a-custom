"use client";

// Label is switched by CSS (.when-light / .when-dark in globals.css), so the server HTML is
// already correct for the stored or system theme and nothing flashes before hydration.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("jac:theme", next);
    } catch {
      // storage blocked: the choice still applies for this page view
    }
    window.dispatchEvent(new Event("jac:theme"));
  }

  return (
    <button type="button" onClick={toggle} className="btn-tool gap-2 border-transparent bg-transparent px-2.5">
      <span
        aria-hidden="true"
        className="inline-block size-3 border border-ink"
        style={{ background: "linear-gradient(135deg, var(--paper) 50%, var(--ink) 50%)" }}
      />
      <span className="when-light">
        <span className="sr-only">Mode tampilan: </span>Kalkir<span className="sr-only">. Ganti ke Blueprint.</span>
      </span>
      <span className="when-dark">
        <span className="sr-only">Mode tampilan: </span>Blueprint<span className="sr-only">. Ganti ke Kalkir.</span>
      </span>
    </button>
  );
}
