
import { PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";

export const GEMZA_NETWORK = "devnet" as const;

export const GEMZA_CONNECTION_URL =
  "https://api.devnet.solana.com";

export const RAYDIUM_LAUNCHLAB_PROGRAM_ID =
  DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM;

export const GEMZA_PROGRAM_ID = new PublicKey(
  "7WaEPvPY8oCvTCQsFWDoXWmp5Xjnt5Ak2Ky8ZYigaPcK"
);
