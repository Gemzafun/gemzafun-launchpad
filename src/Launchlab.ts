
import {
  Connection,
  clusterApiUrl,
  PublicKey,
} from "@solana/web3.js";

import {
  DEVNET_PROGRAM_ID,
  getPdaLaunchpadConfigId,
  LaunchpadConfig,
} from "@raydium-io/raydium-sdk-v2";

import { NATIVE_MINT } from "@solana/spl-token";

const connection = new Connection(
  clusterApiUrl("devnet"),
  "confirmed"
);

export async function checkLaunchLabDevnet() {
  const programId = DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM;

  const programInfo = await connection.getAccountInfo(programId);

  if (!programInfo) {
    throw new Error("Raydium LaunchLab program not found on Devnet.");
  }

  const configAddress = getPdaLaunchpadConfigId(
    programId,
    NATIVE_MINT,
    0,
    0
  ).publicKey;

  const configAccount = await connection.getAccountInfo(configAddress);

  if (!configAccount) {
    throw new Error("LaunchLab configuration not found on Devnet.");
  }

  const config = LaunchpadConfig.decode(configAccount.data);

  return {
    network: "Solana Devnet",
    programId: programId.toBase58(),
    configAddress: configAddress.toBase58(),
    configExists: true,
    quoteMint: new PublicKey(config.mintB).toBase58(),
  };
}
