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
  LaunchpadPoolInitParam,
  getPdaLaunchpadConfigId,
  getPdaLaunchpadPoolId,
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

  const programInfo =
    await launchConnection.getAccountInfo(programId);

  if (!programInfo || !programInfo.executable) {
    throw new Error(
      "Raydium LaunchLab program verification failed."
    );
  }

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

  if (!account.owner.equals(programId)) {
    throw new Error(
      "LaunchLab config owner verification failed."
    );
  }

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

/**
 * Creates a new Raydium LaunchLab mint and bonding-curve pool.
 * This is intentionally separate from createDevnetToken(): LaunchLab
 * creates its own mint; it cannot attach an existing standalone mint.
 */
export async function createLaunchLabBondingCurve(input: {
  raydium: Awaited<ReturnType<typeof loadRaydiumForWallet>>;
  name: string;
  symbol: string;
  metadataUri: string;
}) {
  const name = input.name.trim();
  const symbol = input.symbol.trim().toUpperCase();

  if (!name || name.length > 32) {
    throw new Error("Token name must contain 1–32 characters.");
  }

  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) {
    throw new Error("Token symbol must contain 1–10 letters or numbers.");
  }

  let metadataUrl: URL;
  try {
    metadataUrl = new URL(input.metadataUri);
  } catch {
    throw new Error("Token metadata URL is invalid.");
  }

  if (metadataUrl.protocol !== "https:") {
    throw new Error("Token metadata must use HTTPS.");
  }

  if (metadataUrl.toString().length > 200) {
    throw new Error("Token metadata URL is too long for LaunchLab.");
  }

  const programId = DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM;
  const { configId, config } = await readLaunchConfig();

  // Confirm the configured quote mint and its token program/decimals.
  const mintBInfo = await input.raydium.token.getTokenInfo(config.mintB);
  if (!new PublicKey(mintBInfo.address).equals(NATIVE_MINT)) {
    throw new Error("The verified LaunchLab config is not using SOL.");
  }

  const mintKeypair = Keypair.generate();
  const mintA = mintKeypair.publicKey;

  const { execute } = await input.raydium.launchpad.createLaunchpad({
    programId,
    mintA,
    decimals: LaunchpadPoolInitParam.decimals,
    name,
    symbol,
    uri: metadataUrl.toString(),
    migrateType: "amm",
    configId,
    configInfo: config,
    mintBDecimals: mintBInfo.decimals,
    mintBProgram: new PublicKey(mintBInfo.programId),
    txVersion: TxVersion.V0,
    slippage: new BN(100),
    buyAmount: new BN(0),
    createOnly: true,
    extraSigners: [mintKeypair],
  });

  // LaunchLab returns multiple transactions. They must execute in order.
  const execution = await execute({ sequentially: true });

  const poolId = getPdaLaunchpadPoolId(
    programId,
    mintA,
    NATIVE_MINT
  ).publicKey;

  // Do not report success until both accounts are visible on Devnet.
  const [mintAccount, poolAccount] = await Promise.all([
    launchConnection.getAccountInfo(mintA, "confirmed"),
    launchConnection.getAccountInfo(poolId, "confirmed"),
  ]);

  if (!mintAccount) {
    throw new Error(
      "Launch transactions were submitted, but the new token mint could not be verified on Devnet."
    );
  }

  if (!poolAccount || !poolAccount.owner.equals(programId)) {
    throw new Error(
      "Launch transactions were submitted, but the LaunchLab pool could not be verified on Devnet."
    );
  }

  return {
    mintAddress: mintA.toBase58(),
    poolAddress: poolId.toBase58(),
    signatures: Array.isArray(execution?.txIds) ? execution.txIds : [],
    mintExplorerUrl:
      `https://explorer.solana.com/address/${mintA.toBase58()}?cluster=devnet`,
    poolExplorerUrl:
      `https://explorer.solana.com/address/${poolId.toBase58()}?cluster=devnet`,
  };
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
