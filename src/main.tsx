
console.log("GEMZA main.tsx loaded");
import "./polyfills";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  checkLaunchLabDevnet,
  checkGemzaMetadata,
  checkGemzaMintAuthority,
  checkTokenDetails,
} from "./Launchlab";
import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import { loadRaydiumForWallet } from "./launchTransaction";
import { createDevnetToken } from "./tokenCreation";
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
const [walletProvider, setWalletProvider] =
  useState<WalletProvider | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [status, setStatus] = useState("Solana Devnet ready");
const [launchLabStatus, setLaunchLabStatus] = useState("Checking Raydium LaunchLab...");
  const [busy, setBusy] = useState(false);
const [raydiumStatus, setRaydiumStatus] = useState(
  "Raydium SDK not connected"
);
const [tokenName, setTokenName] = useState("");
const [tokenSymbol, setTokenSymbol] = useState("");
const [tokenImage, setTokenImage] = useState("");
const [imageUploading, setImageUploading] = useState(false);
const [imageUploadStatus, setImageUploadStatus] = useState("");
const [tokenSupply, setTokenSupply] = useState("1000000000");
const [tokenDecimals, setTokenDecimals] = useState("9");
const [revokeMintAuthority, setRevokeMintAuthority] = useState(false);
const [createdToken, setCreatedToken] = useState<{
  mintAddress: string;
  signature: string;
  explorerUrl: string;
  mintExplorerUrl: string;
} | null>(null);
const [newTokenDetails, setNewTokenDetails] = useState<{
  mint: string;
  supply: string;
  decimals: number;
  mintAuthority: string | null;
  metadataAddress: string;
  metadataExists: boolean;
  metadataOwner: string;
} | null>(null);
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

  async function loadHostedMetadata() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/Gemzafun/gemzafun-launchpad/main/gemza-token-metadata.json"
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!cancelled) {
        setHostedMetadata(data);
        setHostedMetadataStatus("Hosted metadata loaded (website display only).");
      }
    } catch (error) {
      if (!cancelled) {
        setHostedMetadataStatus("Could not load hosted metadata.");
      }
    }
  }

  void loadHostedMetadata();

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
      setLaunchLabStatus("Checking Raydium LaunchLab on Devnet...");

      const result = await checkLaunchLabDevnet();

      if (cancelled) return;

      console.log("LaunchLab Devnet check:", result);

      setLaunchLabStatus(
  "LaunchLab verified" +
  " | Config: " + result.configAddress +
  " | Quote mint: " + result.quoteMint +
  " | Minimum fundraising: " + result.minFundRaisingB +
  " | Minimum supply: " + result.minSupplyA +
  " | Minimum sell rate: " + result.minSellRateA +
  " | Migration rate: " + result.minMigrateRateA +
  " | Curve type: " + result.curveType +
  " | Trade fee: " + result.tradeFeeRate +
  " | Migration fee: " + result.migrateFee
);
    } catch (error) {
      if (cancelled) return;

      console.error("LaunchLab check failed:", error);

      setLaunchLabStatus(
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
if (!provider.signAllTransactions) {
  throw new Error(
    "Your Phantom wallet does not support transaction batch signing."
  );
}

    const lamports = await connection.getBalance(response.publicKey);

    setWallet(address);
setWalletProvider(provider);
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
setWalletProvider(null);
      setBalance(null);
      setStatus("Wallet disconnected");
    }
  }

async function connectRaydiumSdk() {
  if (!wallet || !walletProvider?.signAllTransactions) {
    setRaydiumStatus("Connect Phantom first.");
    return;
  }

  try {
    setRaydiumStatus("Connecting to Raydium SDK...");

    await loadRaydiumForWallet({
      publicKey: new PublicKey(wallet),
      signAllTransactions: (transactions) =>
        walletProvider.signAllTransactions!(transactions),
    });

    setRaydiumStatus("Raydium SDK connected on Devnet.");
  } catch (error) {
    setRaydiumStatus(
      error instanceof Error
        ? "Raydium connection failed: " + error.message
        : "Raydium connection failed."
    );
  }
}

async function uploadTokenImage(file: File) {
  if (!file.type.startsWith("image/")) {
    setImageUploadStatus("Please select an image file.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setImageUploadStatus("Maximum image size is 10 MB.");
    return;
  }

  setImageUploading(true);
  setImageUploadStatus("Uploading image to Pinata...");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      "/.netlify/functions/pinata-upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success || !result.url) {
      throw new Error(result.error || "Image upload failed.");
    }

    setTokenImage(result.url);
    setImageUploadStatus("Image uploaded successfully!");
  } catch (error) {
    setImageUploadStatus(
      error instanceof Error ? error.message : "Upload failed."
    );
  } finally {
    setImageUploading(false);
  }
}


async function handleCreateToken() {
  if (!wallet || !walletProvider) {
    setStatus("Connect Phantom before creating a token.");
    return;
  }

  if (!walletProvider.signTransaction) {
    setStatus("Phantom transaction signing is unavailable.");
    return;
  }

  if (revokeMintAuthority) {
    const confirmed = window.confirm(
      "WARNING: Mint authority will be permanently revoked. Continue?"
    );

    if (!confirmed) return;
  }

  setBusy(true);
  setCreatedToken(null);
  setStatus("Preparing your token on Solana Devnet...");

  try {
    const result = await createDevnetToken({
      connection,
      wallet: new PublicKey(wallet),
      signTransaction: (transaction) =>
        walletProvider.signTransaction!(transaction),
      name: tokenName,
      symbol: tokenSymbol,
      image: tokenImage,
      supply: tokenSupply,
      decimals: Number(tokenDecimals),
      revokeMintAuthority,
    });

    setCreatedToken(result);
setNewTokenDetails(null);

try {
  const details = await checkTokenDetails(result.mintAddress);
  setNewTokenDetails(details);
} catch (verificationError) {
  console.error("Token verification failed:", verificationError);
}
    setStatus("Token successfully created on Solana Devnet!");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? "Token creation failed: " + error.message
        : "Token creation failed."
    );
  } finally {
    setBusy(false);
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

<label htmlFor="token-image-file">Upload token image</label>
<input
  id="token-image-file"
  type="file"
  accept="image/*"
  disabled={imageUploading}
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) void uploadTokenImage(file);
  }}
/>

<p>{imageUploadStatus}</p>

{tokenImage && (
  <div className="token-image-preview">
    <img
      src={tokenImage}
      alt="Token image preview"
    />
    <p>Token image preview</p>
  </div>
)}

  <label htmlFor="token-supply">Total supply</label>
  <input
  id="token-supply"
  type="number"
  min="1"
  step="1"
  value={tokenSupply}
  onChange={(e) => setTokenSupply(e.target.value)}
/>

<label htmlFor="token-decimals">Token decimals</label>
<select
  id="token-decimals"
  value={tokenDecimals}
  onChange={(e) => setTokenDecimals(e.target.value)}
>
  {Array.from({ length: 19 }, (_, i) => (
    <option key={i} value={i}>
      {i} decimals
    </option>
  ))}
</select>

<label className="authority-option">
  <input
    type="checkbox"
    checked={revokeMintAuthority}
    onChange={(e) =>
      setRevokeMintAuthority(e.target.checked)
    }
  />
  Revoke mint authority permanently
</label>

<p className="field-hint">
  If selected, no additional tokens can be minted after creation.
  This action cannot be undone.
</p>

  <button
  type="button"
  disabled={busy || imageUploading || !wallet}
  onClick={handleCreateToken}
>
  {busy ? "Creating Token..." : "Create Token"}
</button>
</div>


{createdToken && (
  <div className="program-status">
    <h3>Token Created Successfully!</h3>

    <p>Network: Solana Devnet</p>

    <p>Mint Address:</p>
    <p className="address">{createdToken.mintAddress}</p>

    <p>Transaction:</p>
    <p className="address">{createdToken.signature}</p>

    <p>
      <a
        href={createdToken.mintExplorerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View Token on Solana Explorer
      </a>
    </p>

    <p>
      <a
        href={createdToken.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View Transaction
      </a>
    </p>
  </div>
)}

{newTokenDetails && (
  <div className="program-status">
    <h3>New Token Verification</h3>

    <p>
      <strong>On-chain verification:</strong> Successful
    </p>

    <p>Mint Address:</p>
    <p className="address">{newTokenDetails.mint}</p>

    <p>
      Supply (base units): {newTokenDetails.supply}
    </p>

    <p>
      Decimals: {newTokenDetails.decimals}
    </p>

    <p>
      Mint Authority:{" "}
      {newTokenDetails.mintAuthority ?? "Revoked"}
    </p>

    <p>
      Metaplex Metadata:{" "}
      {newTokenDetails.metadataExists
        ? "Account exists"
        : "Not found"}
    </p>

    <p>Metadata Account:</p>
    <p className="address">
      {newTokenDetails.metadataAddress}
    </p>
  </div>
)}
        

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

<button
  type="button"
  disabled={!wallet || busy}
  onClick={connectRaydiumSdk}
>
  Connect Raydium SDK
</button>
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

  <p>{hostedMetadataStatus}</p>

  {hostedMetadata && (
    <>
      <p>Name: {hostedMetadata.name ?? "—"}</p>
      <p>Symbol: {hostedMetadata.symbol ?? "—"}</p>
      <p>Description: {hostedMetadata.description ?? "—"}</p>

      {hostedMetadata.image && (
        <img
          src={hostedMetadata.image}
          alt="GEMZA token"
          style={{
            width: "120px",
            height: "120px",
            objectFit: "cover",
            borderRadius: "12px"
          }}
        />
      )}
    </>
  )}

  <p>On-chain Metaplex metadata: {metadataStatus}</p>
  <p>Mint authority: {mintAuthorityStatus}</p>
</div>


<p className="notice">{status}</p>
<div className="program-status">
  <h3>Raydium LaunchLab Configuration</h3>
  <p>{launchLabStatus}</p>
</div>
<div className="program-status">
  <h3>Raydium SDK Connection</h3>
  <p>{raydiumStatus}</p>
</div>
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
