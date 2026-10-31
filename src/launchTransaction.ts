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

  const configId = getPdaLaunchpadConfigId(
    programId,
    NATIVE_MINT,
    0,
    0
  ).publicKey;

  const account = await launchConnection.getAccountInfo(configId);

  if (!account) {
    throw new Error("Raydium LaunchLab config not found on Devnet.");
  }

  return {
    configId,
    config: LaunchpadConfig.decode(account.data),
  };
}