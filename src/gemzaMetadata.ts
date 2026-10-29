
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const GEMZA_MINT = new PublicKey(
  "BXFE79KMMf2RtCLqbVLGkjBkVZipnT6H4A2qs9mMiYnF"
);

const METADATA_URI =
  "https://raw.githubusercontent.com/Gemzafun/gemzafun-launchpad/main/gemza-token-metadata.json";

export async function prepareGemzaMetadataTransaction(
  connection: Connection,
  wallet: PublicKey
): Promise<Transaction> {
  const mintInfo = await connection.getAccountInfo(GEMZA_MINT);

  if (!mintInfo) {
    throw new Error("GEMZA mint was not found on this network.");
  }

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      GEMZA_MINT.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const existingMetadata =
    await connection.getAccountInfo(metadataPda);

  if (existingMetadata) {
    throw new Error(
      "Metadata account already exists. Do not create it again."
    );
  }

  const mintAuthority = wallet;

  const instruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPda,
        mint: GEMZA_MINT,
        mintAuthority,
        payer: wallet,
        updateAuthority: wallet,
        systemProgram: SystemProgram.programId,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: "Gemzafun",
            symbol: "GEMZA",
            uri: METADATA_URI,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      },
      METADATA_PROGRAM_ID
    );

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet;
  transaction.recentBlockhash =
    (await connection.getLatestBlockhash("confirmed")).blockhash;

  return transaction;
}
