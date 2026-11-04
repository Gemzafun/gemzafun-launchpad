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