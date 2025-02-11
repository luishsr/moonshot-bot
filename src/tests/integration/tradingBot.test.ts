import request from "supertest";
import app from "../../index";
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { moonshotService } from "../../services/moonshotService";
import userWalletSecret from "../../../test-wallet.json"; 
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

console.log("TRADE_TYPE env variable:", process.env.TRADE_TYPE);

const tradeType = (process.env.TRADE_TYPE || "").trim().toLowerCase() === "sell" ? "sell" : "buy";
console.log(`Trade type selected: ${tradeType}`);

describe("Trading Bot API", () => {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const userWalletStr = process.env.USER_WALLET!;
  const feeWalletStr = process.env.FEE_WALLET!;
  const connection = new Connection(rpcUrl);
  const userKeypair = Keypair.fromSecretKey(Uint8Array.from(userWalletSecret));
  let parsedFeeLamports = 0;

  beforeAll(async () => {
    const userPubkey = new PublicKey(userWalletStr);
    const feePubkey = new PublicKey(feeWalletStr);
  });

  it(`should prepare a transaction (${tradeType}) and return unsignedTx`, async () => {
    const response = await request(app)
      .post("/api/trading/prepare")
      .send({
        userWallet: userWalletStr,
        tradeType,
        amount: 1000,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Transaction prepared successfully");
    expect(response.body.unsignedTx).toBeDefined();

    const unsignedTxBase64 = response.body.unsignedTx;
    const unsignedBuffer = Buffer.from(unsignedTxBase64, "base64");
    const transaction = VersionedTransaction.deserialize(unsignedBuffer);
  });

  it("should sign the prepared transaction and submit it", async () => {
    const prepRes = await request(app)
      .post("/api/trading/prepare")
      .send({
        userWallet: userWalletStr,
        tradeType,
        amount: 1000,
      });
    expect(prepRes.status).toBe(200);

    const unsignedTxBase64 = prepRes.body.unsignedTx;
    const unsignedBuffer = Buffer.from(unsignedTxBase64, "base64");
    const unsignedTx = VersionedTransaction.deserialize(unsignedBuffer);

    unsignedTx.sign([userKeypair]);
    const signedTxBase64 = Buffer.from(unsignedTx.serialize()).toString("base64");

    const submitRes = await request(app)
      .post("/api/trading/submit")
      .send({ signedTx: signedTxBase64 });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.txHash).toBeDefined();

    const txHash = submitRes.body.txHash;
    console.log(`Transaction confirmed: https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
  });
});
