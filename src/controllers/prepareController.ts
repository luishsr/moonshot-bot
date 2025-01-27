import { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { moonshotService } from "../services/moonshotService";

export const prepareTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userWallet, tradeType, amount } = req.body;

    if (!userWallet || !tradeType || amount === undefined) {
      res.status(400).json({ error: "Missing required fields (userWallet, tradeType, amount)" });
      return
    }

    if (!PublicKey.isOnCurve(userWallet)) {
      res.status(400).json({ error: "Invalid userWallet public key" });
      return
    }

    const tradeTypeLower = String(tradeType).toLowerCase();
    if (tradeTypeLower !== "buy" && tradeTypeLower !== "sell") {
      res.status(400).json({ error: "Invalid tradeType (must be 'buy' or 'sell')" });
      return
    }

    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: "Invalid amount (must be a positive integer)" });
      return
    }

    const userPubkey = new PublicKey(userWallet);

    // Build an *unsigned* VersionedTransaction
    const transaction = await moonshotService.createUnsignedTradeTransaction(
      userPubkey,
      tradeTypeLower === "buy" ? "buy" : "sell",
      numericAmount
    );

    // Serialize the *unsigned* transaction
    const serializedTx = Buffer.from(transaction.serialize()).toString("base64");

    res.status(200).json({
      message: "Transaction prepared successfully",
      unsignedTx: serializedTx,
    });
    return

  } catch (error) {
    console.error("Error in prepareTransaction:", error);
    res.status(500).json({ error: "Internal server error" });
    return
  }
};
