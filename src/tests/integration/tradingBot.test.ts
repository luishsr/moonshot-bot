import request from "supertest";
import app from "../../index";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

import { moonshotService } from "../../services/moonshotService";
import userWalletSecret from "../../../test-wallet.json"; 
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

describe("Trading Bot API", () => {
  // Load addresses from environment
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const userWalletStr = process.env.USER_WALLET!; // The user’s public key
  const feeWalletStr = process.env.FEE_WALLET!;   // Fee collector public key

  // Devnet connection
  const connection = new Connection(rpcUrl);

  // The user Keypair from the local test-user.json
  // This *must* match the userWalletStr in .env (same public key).
  const userKeypair = Keypair.fromSecretKey(Uint8Array.from(userWalletSecret));

  // The total lamports of the fee we parse out of the transaction
  let parsedFeeLamports = 0;

  beforeAll(async () => {
    // Convert user & fee wallet strings to PublicKeys
    const userPubkey = new PublicKey(userWalletStr);
    const feePubkey = new PublicKey(feeWalletStr);

  });

  it("should prepare a transaction (buy) and return unsignedTx", async () => {
    const response = await request(app)
      .post("/api/trading/prepare")
      .send({
        userWallet: userWalletStr,
        tradeType: "buy",
        amount: 1000,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Transaction prepared successfully");
    expect(response.body.unsignedTx).toBeDefined();

    // Parse the returned transaction, just to confirm it compiles
    const unsignedTxBase64 = response.body.unsignedTx;
    const unsignedBuffer = Buffer.from(unsignedTxBase64, "base64");
    const transaction = VersionedTransaction.deserialize(unsignedBuffer);

    // Locate the fee instruction to extract the lamports for later comparison
    const instructions = transaction.message.compiledInstructions;
    // Search for a SystemProgram.transfer with userWallet & feeWallet
    // to find which compiledInstruction is the transfer.
    const accountKeys = transaction.message.staticAccountKeys;

    instructions.forEach((ci, index) => {
      const programId = accountKeys[ci.programIdIndex];
      const keys = ci.accountKeyIndexes.map((k) => accountKeys[k]);
      if (
        programId.toBase58() === "11111111111111111111111111111111" &&
        keys.length === 2 &&
        keys[0].toBase58() === userWalletStr &&
        keys[1].toBase58() === feeWalletStr
      ) {
        // Data[0..4] => instruction type (2 = transfer)
        // Data[4..12] => lamports as little-endian
        const data = ci.data;
        const transferType = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);
        // parse lamports from data[4..11]
        const lamports =
          data[4] +
          (data[5] << 8) +
          (data[6] << 16) +
          (data[7] << 24);

        parsedFeeLamports = lamports;
        console.log(
          `Found fee instruction in compiled ix #${index}, type=${transferType}, lamports=${lamports}`
        );
      }
    });
  });

  it("should sign the prepared transaction and submit it", async () => {
    // Prepare
    const prepRes = await request(app)
      .post("/api/trading/prepare")
      .send({
        userWallet: userWalletStr,
        tradeType: "buy",
        amount: 1000,
      });
    expect(prepRes.status).toBe(200);

    const unsignedTxBase64 = prepRes.body.unsignedTx;
    const unsignedBuffer = Buffer.from(unsignedTxBase64, "base64");
    const unsignedTx = VersionedTransaction.deserialize(unsignedBuffer);

    // Sign with the user's private key
    unsignedTx.sign([userKeypair]);

    // Re-serialize
    const signedTxBase64 = Buffer.from(unsignedTx.serialize()).toString("base64");

    // Submit
    const submitRes = await request(app)
      .post("/api/trading/submit")
      .send({ signedTx: signedTxBase64 });

    console.log("Submit response:", submitRes.body);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.txHash).toBeDefined();

    const txHash = submitRes.body.txHash;

    // Wait for confirmation
    try {
      const sigConfirmation = await connection.confirmTransaction(txHash, "confirmed");
      console.log("Sig confirmation:", sigConfirmation);
    } catch (err) {
      console.warn("Error confirmTransaction:", err);
    }

    // Do a small loop or 2-second sleep
    let txReceipt = null;
    for (let i = 0; i < 5; i++) {
      txReceipt = await connection.getTransaction(txHash, { commitment: "confirmed" , maxSupportedTransactionVersion: 0});
      if (txReceipt) break;
      console.log("Transaction not found yet. Retrying...");
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!txReceipt) {
      // If still null, print logs for debugging
      const statuses = await connection.getSignatureStatuses([txHash]);
      console.error("Signature statuses:", statuses.value[0]);
    }

    expect(txReceipt).not.toBeNull();
    console.log("Transaction confirmed on-chain. Signature:", txHash);

  });
});