
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


export async function checkGemzaMetadata() {
  const mint = new PublicKey(
    "BXFE79KMMf2RtCLqbVLGkjBkVZipnT6H4A2qs9mMiYnF"
  );

  const mintInfo = await connection.getAccountInfo(mint);

  if (!mintInfo) {
    throw new Error("GEMZA mint not found on Devnet.");
  }

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("metadata"),
      new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
      ).toBytes(),
      mint.toBytes(),
    ],
    new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    )
  );

  const metadataInfo = await connection.getAccountInfo(metadataPda);

  return {
    mint: mint.toBase58(),
    metadataAddress: metadataPda.toBase58(),
    metadataExists: metadataInfo !== null,
    metadataOwner: metadataInfo?.owner.toBase58() ?? "No metadata account",
  };
}
