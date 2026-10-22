
import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return (
    <main className="app">
      <header className="header">
        <a className="logo" href="/">
          GEMZA<span>.FUN</span>
        </a>
        <span className="network">SOLANA DEVNET BETA</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR MULTICHAIN TRADING HUB</p>
        <h1>Your Token.<br />Your Launch.</h1>
        <p className="description">
          Create and launch tokens with GEMZA.FUN.
          Solana Devnet testing comes first.
        </p>
        <div className="actions">
          <button disabled>Wallet integration coming next</button>
        </div>
        <p className="notice">
          Development build — no real launches or trades are enabled yet.
        </p>
      </section>

      <footer>
        GEMZA.FUN · Solana Devnet · Test environment only
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
