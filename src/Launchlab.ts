
import {
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";

import {
  DEVNET_PROGRAM_ID,
  getPdaLaunchpadConfigId,
} from "@raydium-io/raydium-sdk-v2";

import { NATIVE_MINT } from "@solana/spl-token";

const connection = new Connection(
  clusterApiUrl("devnet"),
  "confirmed"
);

export async function checkLaunchLabDevnet() {
  const programId = DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM;

  const configAddress = getPdaLaunchpadConfigId(
    programId,
    NATIVE_MINT,
    0,
    0
  ).publicKey;

  const account = await connection.getAccountInfo(configAddress);

  return {
    network: "Solana Devnet",
    programId: programId.toBase58(),
    configAddress: configAddress.toBase58(),
    configExists: account !== null,
  };
}
