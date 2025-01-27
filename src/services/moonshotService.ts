// services/moonshotService.ts
import {
  PublicKey,
  TransactionInstruction,
  Connection,
  SystemProgram,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Moonshot, Environment, FixedSide } from "@wen-moon-ser/moonshot-sdk";
import { config } from "../utils/env";

const connection = new Connection(config.RPC_URL);

const moonshotSDK = new Moonshot({
  rpcUrl: config.RPC_URL,
  environment: Environment.DEVNET,
  chainOptions: {
    solana: { confirmOptions: { commitment: "confirmed" } }
  },
});

export const moonshotService = {
  /**
   * Create an *unsigned* transaction containing:
   * - A setComputeUnitPrice (priority) instruction
   * - A SystemProgram.transfer of 1% SOL fee from user -> fee wallet
   * - The Moonshot buy or sell instructions
   */
  async createUnsignedTradeTransaction(
    userPubkey: PublicKey,
    tradeType: "buy" | "sell",
    amount: number
  ): Promise<VersionedTransaction> {
    // Prepare instructions for the token trade
    const feeWallet = new PublicKey(config.FEE_WALLET);

    const token = await moonshotSDK
      .Token({
        mintAddress: "9ThH8ayxFCFZqssoZmodgvtbTiBmMoLWUqQhRAP89Y97",
      })
      .preload();

    const curvePos = await token.getCurvePosition();
    const tokenAmount = BigInt(amount) * BigInt(1e9);

    const sdkTradeDirection = tradeType.toUpperCase() === "BUY" ? "BUY" : "SELL";

    // Collateral needed or gained
    const collateralAmount = token.getCollateralAmountByTokensSync({
      tokenAmount,
      tradeDirection: sdkTradeDirection,
      curvePosition: curvePos,
    });

    // Prepare the actual buy/sell instructions
    const { ixs } = await token.prepareIxs({
      slippageBps: 500,
      creatorPK: userPubkey.toBase58(),
      tokenAmount,
      collateralAmount,
      tradeDirection: sdkTradeDirection,
      fixedSide: FixedSide.OUT,
    });

    // Priority fee instruction
    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 200_000,
    });

    // 1% SOL fee
    const feeAmount = BigInt(collateralAmount) / BigInt(100);
    const feeIx = SystemProgram.transfer({
      fromPubkey: userPubkey,
      toPubkey: feeWallet,
      lamports: Number(feeAmount),
    });

    // Build the *unsigned* VersionedTransaction
    const blockhashInfo = await connection.getLatestBlockhash("confirmed");

    // The payerKey is the user
    const messageV0 = new TransactionMessage({
      payerKey: userPubkey,
      recentBlockhash: blockhashInfo.blockhash,
      instructions: [priorityIx, feeIx, ...ixs],
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);

    // Return *unsigned* transaction
    return versionedTx;
  },

  /**
   * Sends a transaction that has already been fully signed by the user
   */
  async sendSignedTransaction(transaction: VersionedTransaction): Promise<string> {
    // The transaction is already signed by the user, no further sign calls needed
    const txHash = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      maxRetries: 5,
      preflightCommitment: "confirmed",
    });

    return txHash;
  },
};
