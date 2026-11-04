
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import {
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const MAX_U64 = 18446744073709551615n;

type CreateTokenInput = {
  connection: Connection;
  wallet: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  name: string;
  symbol: string;
  image: string;
  supply: string;
  decimals: number;
  revokeMintAuthority: boolean;
};

async function uploadMetadata(
  name: string,
  symbol: string,
  image: string
): Promise<string> {
  const metadata = {
    name,
    symbol,
    description: `${name} token created on GEMZA.FUN.`,
    image,
  };

  const formData = new FormData();

  const file = new Blob(
    [JSON.stringify(metadata)],
    { type: "application/json" }
  );

  formData.append("file", file, "token-metadata.json");

  const response = await fetch(
    "/.netlify/functions/pinata-upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success || !result.url) {
    throw new Error(
      result.error || "Metadata upload to Pinata failed."
    );
  }

  return result.url;
}

export async function createDevnetToken(
  input: CreateTokenInput
) {
  const name = input.name.trim();
  const symbol = input.symbol.trim().toUpperCase();
  const supplyText = input.supply.trim();

  if (!name || name.length > 32) {
    throw new Error("Token name must contain 1–32 characters.");
  }

  if (!symbol || symbol.length > 10) {
    throw new Error("Token symbol must contain 1–10 characters.");
  }

  if (!input.image.startsWith("https://")) {
    throw new Error("Upload a token image before continuing.");
  }

  if (!/^\d+$/.test(supplyText)) {
    throw new Error("Supply must be a positive whole number.");
  }

  const supply = BigInt(supplyText);

  if (supply <= 0n) {
    throw new Error("Supply must be greater than zero.");
  }

  if (
    !Number.isInteger(input.decimals) ||
    input.decimals < 0 ||
    input.decimals > 18
  ) {
    throw new Error("Decimals must be between 0 and 18.");
  }

  const mintAmount =
    supply * (10n ** BigInt(input.decimals));

  if (mintAmount > MAX_U64) {
    throw new Error("Supply is too large for a Solana token.");
  }

  // Upload the token's JSON metadata to IPFS.
  const metadataUri = await uploadMetadata(
    name,
    symbol,
    input.image
  );

  if (metadataUri.length > 200) {
    throw new Error("Metadata URI is too long.");
  }

  // Generate a fresh mint keypair.
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const wallet = input.wallet;

  // Derive the creator's associated token account.
  const tokenAccount = getAssociatedTokenAddressSync(
    mint,
    wallet,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Derive the Metaplex metadata account.
  const [metadataAddress] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

  const transaction = new Transaction();

  const rent =
    await input.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );

  // 1. Create the mint account.
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: wallet,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // 2. Initialize the token mint.
  transaction.add(
    createInitializeMintInstruction(
      mint,
      input.decimals,
      wallet,
      wallet,
      TOKEN_PROGRAM_ID
    )
  );

  // 3. Create the creator's token account.
  transaction.add(
    createAssociatedTokenAccountInstruction(
      wallet,
      tokenAccount,
      wallet,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // 4. Mint the requested initial supply.
  transaction.add(
    createMintToInstruction(
      mint,
      tokenAccount,
      wallet,
      mintAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // 5. Create on-chain Metaplex metadata.
  transaction.add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint,
        mintAuthority: wallet,
        payer: wallet,
        updateAuthority: wallet,
        systemProgram: SystemProgram.programId,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name,
            symbol,
            uri: metadataUri,
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
    )
  );

  // 6. Revoke mint authority only if requested.
  // This must happen after metadata creation.
  if (input.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mint,
        wallet,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  // Prepare and sign the transaction.
  const latestBlockhash =
    await input.connection.getLatestBlockhash("confirmed");

  transaction.feePayer = wallet;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  // The new mint keypair signs its account-creation instruction.
  transaction.partialSign(mintKeypair);

  // Phantom signs as the wallet owner.
  const signedTransaction =
    await input.signTransaction(transaction);

  // Submit to Solana Devnet.
  const signature =
    await input.connection.sendRawTransaction(
      signedTransaction.serialize()
    );

  const confirmation =
    await input.connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight:
          latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

  if (confirmation.value.err) {
    throw new Error(
      "Transaction failed: " +
      JSON.stringify(confirmation.value.err)
    );
  }

  return {
    mintAddress: mint.toBase58(),
    tokenAccount: tokenAccount.toBase58(),
    metadataAddress: metadataAddress.toBase58(),
    metadataUri,
    signature,
    explorerUrl:
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    mintExplorerUrl:
      `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`,
  };
}
