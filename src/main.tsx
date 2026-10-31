
console.log("GEMZA main.tsx loaded");
import "./polyfills";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  checkLaunchLabDevnet,
  checkGemzaMetadata,
  checkGemzaMintAuthority,
} from "./Launchlab";
import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import "./style.css";

type WalletProvider = {
  publicKey?: PublicKey;
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signTransaction?: (transaction: any) => Promise<any>;
  signAllTransactions?: (transactions: any[]) => Promise<any[]>;
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
const [tokenName, setTokenName] = useState("");
const [tokenSymbol, setTokenSymbol] = useState("");
const [tokenImage, setTokenImage] = useState("");
const [tokenSupply, setTokenSupply] = useState("1000000000");
  const [network, setNetwork] = useState("Solana Devnet");
const launchLabProgramId =
  DEVNET_PROGRAM_ID?.LAUNCHPAD_PROGRAM?.toBase58?.()
  ?? "LaunchLab program ID unavailable";
const [programId, setProgramId] = useState("");
const [configAddress, setConfigAddress] = useState("");
const [configExists, setConfigExists] = useState<boolean | null>(null);
const [configOwner, setConfigOwner] = useState("");
const [ownerMatches, setOwnerMatches] = useState<boolean | null>(null);
const [mintAuthorityStatus, setMintAuthorityStatus] =
  useState("Not checked");
const [metadataStatus, setMetadataStatus] = useState("Not checked");
const [hostedMetadata, setHostedMetadata] = useState<{
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
} | null>(null);

const [hostedMetadataStatus, setHostedMetadataStatus] = useState(
  "Loading hosted metadata..."
);

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


useEffect(() => {
  let cancelled = false;

  async function runMetadataCheck() {
    try {
      setMetadataStatus("Checking GEMZA metadata...");

      const result = await checkGemzaMetadata();

      if (cancelled) return;

      setMetadataStatus(
        result.metadataExists
          ? "Metadata account exists. Owner: " + result.metadataOwner
          : "No Metaplex metadata account found for this mint."
      );

      console.log("GEMZA metadata check:", result);
    } catch (error) {
      if (cancelled) return;

      setMetadataStatus(
        error instanceof Error
          ? "Metadata check failed: " + error.message
          : "Metadata check failed."
      );
    }
  }

  void runMetadataCheck();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  let cancelled = false;

  async function checkAuthority() {
    try {
      const result = await checkGemzaMintAuthority();

      if (cancelled) return;

      setMintAuthorityStatus(
        result.mintAuthority ?? "No mint authority"
      );

      console.log("GEMZA mint authority:", result);
    } catch (error) {
      if (cancelled) return;

      setMintAuthorityStatus(
        error instanceof Error ? error.message : "Check failed"
      );
    }
  }

  void checkAuthority();

  return () => {
    cancelled = true;
  };
}, []);


useEffect(() => {
  let cancelled = false;

  async function checkLaunchLab() {
    try {
      setStatus("Checking Raydium LaunchLab on Devnet...");

      const result = await checkLaunchLabDevnet();

      if (cancelled) return;

      console.log("LaunchLab Devnet check:", result);

      setStatus(
  "LaunchLab verified. Config: " +
  result.configAddress +
  " | Quote mint: " +
  result.quoteMint
);
    } catch (error) {
      if (cancelled) return;

      console.error("LaunchLab check failed:", error);

      setStatus(
        error instanceof Error
          ? "LaunchLab check failed: " + error.message
          : "LaunchLab check failed"
      );
    }
  }

  void checkLaunchLab();

  return () => {
    cancelled = true;
  };
}, []);


async function connectWallet() {
  setBusy(true);

  try {
    const provider =
      window.phantom?.solana ??
      (window.solana?.isPhantom ? window.solana : undefined);

    if (!provider) {
      setStatus(
        "Phantom not detected. Open GEMZA.FUN directly inside the Phantom app browser."
      );
      return;
    }

    setStatus("Connecting to Phantom...");

    const response = await provider.connect();
    const address = response.publicKey.toString();

    const lamports = await connection.getBalance(response.publicKey);

    setWallet(address);
    setBalance((lamports / 1_000_000_000).toFixed(4));
    setStatus("Connected to Solana Devnet");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? `Wallet connection failed: ${error.message}`
        : "Wallet connection failed"
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



<div className="launch-card">
  <h2>Create a Token</h2>
  <p>Prepare your token launch on Solana Devnet.</p>

  <label htmlFor="token-name">Token name</label>
  <input
  id="token-name"
  type="text"
  placeholder="e.g. Gemza Token"
  maxLength={32}
  value={tokenName}
  onChange={(e) => setTokenName(e.target.value)}
/>

  <label htmlFor="token-symbol">Token symbol</label>
  <input
  id="token-symbol"
  type="text"
  placeholder="e.g. GEMZA"
  maxLength={10}
  value={tokenSymbol}
  onChange={(e) =>
    setTokenSymbol(e.target.value.toUpperCase())
  }
/>

  <label htmlFor="token-image">Token image URL</label>
  <input
  id="token-image"
  type="url"
  placeholder="https://example.com/token.png"
  value={tokenImage}
  onChange={(e) => setTokenImage(e.target.value)}
/>

  <label htmlFor="token-supply">Total supply</label>
  <input
  id="token-supply"
  type="number"
  min="1"
  step="1"
  value={tokenSupply}
  onChange={(e) => setTokenSupply(e.target.value)}
/>

  <button
    type="button"
    onClick={() =>
      setStatus(
        "Token form added. Launch transactions are not enabled yet."
      )
    }
  >
    Prepare Token Launch
  </button>
</div>

        

<div className="actions">
  {!wallet ? (
    <button
      type="button"
      disabled={busy}
      onClick={connectWallet}
    >
      {busy ? "Connecting..." : "Connect Phantom"}
    </button>
  ) : (
    <button
      type="button"
      onClick={disconnectWallet}
    >
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
<div className="program-status">
  <p>GEMZA Token Metadata</p>
  <p>{metadataStatus}</p>
<p>Mint authority: {mintAuthorityStatus}</p>
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
