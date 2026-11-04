import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";

import {
  Raydium,
  TxVersion,
  DEVNET_PROGRAM_ID,
  DEV_API_URLS,
  LaunchpadConfig,
  getPdaLaunchpadConfigId,
} from "@raydium-io/raydium-sdk-v2";

import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";

export const launchConnection = new Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

export const GEMZA_LAUNCH_CONFIG = {
  network: "devnet",
  quoteMint: NATIVE_MINT,
  curveType: 0,
  defaultCurveAllocationPercent: 51,
};

export async function readLaunchConfig() {
  const programId = DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM;

  // 1. Verify the official Devnet program.
  const programInfo =
    await launchConnection.getAccountInfo(programId);

  if (!programInfo || !programInfo.executable) {
    throw new Error(
      "Raydium LaunchLab program verification failed."
    );
  }

  // 2. Derive the expected SOL configuration.
  const configId = getPdaLaunchpadConfigId(
    programId,
    NATIVE_MINT,
    0,
    0
  ).publicKey;

  const account =
    await launchConnection.getAccountInfo(configId);

  if (!account) {
    throw new Error(
      "Raydium LaunchLab config not found on Devnet."
    );
  }

  // 3. Verify account ownership.
  if (!account.owner.equals(programId)) {
    throw new Error(
      "LaunchLab config owner verification failed."
    );
  }

  // 4. Decode and verify quote mint.
  const config = LaunchpadConfig.decode(account.data);

  if (!new PublicKey(config.mintB).equals(NATIVE_MINT)) {
    throw new Error(
      "Unexpected LaunchLab quote mint."
    );
  }

  return {
    configId,
    config,
  };
}

export async function loadRaydiumForWallet(
  wallet: {
    publicKey: PublicKey;
    signAllTransactions: (transactions: any[]) => Promise<any[]>;
  }
) {
  return await Raydium.load({
    owner: wallet.publicKey,
    connection: launchConnection,
    cluster: "devnet",
    disableFeatureCheck: true,
    blockhashCommitment: "confirmed",
    signAllTransactions: wallet.signAllTransactions,
  });
}

export async function runLaunchPreflight(input: {
  walletAddress: string;
  name: string;
  symbol: string;
  image: string;
  supply: string;
  decimals: number;
}) {
  const wallet = new PublicKey(input.walletAddress);

  const name = input.name.trim();

  if (!name || name.length > 32) {
    throw new Error("Token name must contain 1–32 characters.");
  }

  const symbol = input.symbol.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) {
    throw new Error("Token symbol must contain 1–10 letters or numbers.");
  }

  let imageUrl: URL;

  try {
    imageUrl = new URL(input.image);
  } catch {
    throw new Error("Please upload a valid token image first.");
  }

  if (imageUrl.protocol !== "https:") {
    throw new Error("Image must use HTTPS.");
  }

  if (!/^[1-9]\d*$/.test(input.supply)) {
    throw new Error("Supply must be a positive whole number.");
  }

  if (
    !Number.isInteger(input.decimals) ||
    input.decimals < 0 ||
    input.decimals > 18
  ) {
    throw new Error("Decimals must be between 0 and 18.");
  }

  const balanceLamports =
    await launchConnection.getBalance(wallet, "confirmed");

  if (balanceLamports <= 0) {
    throw new Error("Wallet has no SOL on Devnet.");
  }

  const { configId, config } = await readLaunchConfig();

  return {
    success: true,
    wallet: wallet.toBase58(),
    balanceSol: balanceLamports / 1_000_000_000,
    configAddress: configId.toBase58(),
    quoteMint: new PublicKey(config.mintB).toBase58(),
    tokenName: name,
    tokenSymbol: symbol,
    tokenImage: imageUrl.toString(),
    tokenSupply: input.supply,
    decimals: input.decimals,
  };
}