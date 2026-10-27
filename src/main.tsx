console.log("GEMZA main.tsx loaded");
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { checkLaunchLabDevnet } from "./launchlab.ts";
import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import "./style.css";

type WalletProvider = {
  publicKey?: PublicKey;
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
};

declare global {
  interface Window {
    solana?: WalletProvider;
    phantom?: { solana?: WalletProvider };
  }
}

function App() {
  console.log(
    "Raydium LaunchLab Devnet:",
    DEVNET_PROGRAM_ID?.LAUNCHPAD_PROGRAM?.toBase58?.()
      ?? "LaunchLab program ID unavailable"
  );
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [status, setStatus] = useState("Solana Devnet ready");
  const [busy, setBusy] = useState(false);
  const [network, setNetwork] = useState("Solana Devnet");
const launchLabProgramId =
  DEVNET_PROGRAM_ID?.LAUNCHPAD_PROGRAM?.toBase58?.()
  ?? "LaunchLab program ID unavailable";
const [programId, setProgramId] = useState("");
const [configAddress, setConfigAddress] = useState("");
const [configExists, setConfigExists] = useState<boolean | null>(null);
const [configOwner, setConfigOwner] = useState("");
const [ownerMatches, setOwnerMatches] = useState<boolean | null>(null);

const connection = new Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

useEffect(() => {
  let cancelled = false;

  async function checkProgram() {
    try {
      const programKey = new PublicKey(
        "7WaEPvPY8oCvTCQsFWDoXWmp5Xjnt5Ak2Ky8ZYigaPcK"
      );

      const programAccount =
        await connection.getAccountInfo(programKey);

      const [configPda] =
        PublicKey.findProgramAddressSync(
          [new TextEncoder().encode("gemza-config")],
          programKey
        );

      const configAccount =
        await connection.getAccountInfo(configPda);

if (cancelled) return;

setConfigOwner(
  configAccount?.owner.toBase58() ?? "No account"
);

setOwnerMatches(
  configAccount?.owner.equals(programKey) ?? false
);


      setNetwork("Solana Devnet");
      setProgramId(programKey.toBase58());
      setConfigAddress(configPda.toBase58());
      setConfigExists(configAccount !== null);

      if (!programAccount) {
        setStatus("Program account not found on Devnet");
      } else if (!programAccount.executable) {
        setStatus("Account exists but is not executable");
      } else {
        setStatus("Executable program found on Devnet");
      }
    } catch (error) {
      if (!cancelled) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Devnet status check failed"
        );
      }
    }
  }

  void checkProgram();

  return () => {
    cancelled = true;
  };
}, []);


  async function connectWallet() {
    const provider =
      window.phantom?.solana ??
      (window.solana?.isPhantom ? window.solana : undefined);

    if (!provider) {
      setStatus("Open this website in Phantom's in-app browser.");
      return;
    }

    try {
      setBusy(true);
      setStatus("Connecting wallet...");

      const response = await provider.connect();
      const address = response.publicKey.toString();
      const lamports = await connection.getBalance(
        response.publicKey
      );

      setWallet(address);
      setBalance((lamports / 1_000_000_000).toFixed(4));
      setStatus("Connected to Solana Devnet");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Connection failed"
      );
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWallet() {
    const provider = window.phantom?.solana ?? window.solana;

    try {
      await provider?.disconnect?.();
    } finally {
      setWallet("");
      setBalance(null);
      setStatus("Wallet disconnected");
    }
  }

  return (
    <main className="app">
      <header className="header">
        <a className="logo" href="/">GEMZA<span>.FUN</span></a>
        <span className="network">SOLANA DEVNET BETA</span>

      </header>

      <section className="hero">
        <p className="eyebrow">YOUR MULTICHAIN TRADING HUB</p>
        <h1>Your Token.<br />Your Launch.</h1>
        <p className="description">
          Build, explore, and test token launches on Solana.
        </p>

        <div className="actions">
          {!wallet ? (
            <button onClick={connectWallet} disabled={busy}>
              {busy ? "Connecting..." : "Connect Phantom"}
            </button>
          ) : (
            <button onClick={disconnectWallet}>
              Disconnect Wallet
            </button>
          )}
        </div>

        {wallet && (
          <div className="wallet-card">
            <p><strong>Wallet connected</strong></p>
            <p className="address">{wallet}</p>
            <p>Devnet balance: {balance ?? "Loading"} SOL</p>
          </div>
        )}

        

<div className="program-status">
  <p>Network: {network}</p>
  <p>Program: {programId || "Checking..."}</p>
  <p>Config: {configAddress || "Checking..."}</p>
  <p>
    Config exists:{" "}
    {configExists === null ? "Checking..." : String(configExists)}
  </p>
  <p>Config owner: {configOwner || "Checking..."}</p>
  <p>
    Owner matches program:{" "}
    {ownerMatches === null ? "Checking..." : String(ownerMatches)}
  </p>
</div>


<p className="notice">{status}</p>

        <p className="notice">
          Test environment only. LaunchLab trading is not enabled yet.
        </p>
      </section>

      <footer>
        GEMZA.FUN · Solana Devnet · Test environment only
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
