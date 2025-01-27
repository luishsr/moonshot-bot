// controllers/submitController.ts
import { Request, Response } from "express";
import { moonshotService } from "../services/moonshotService";
import { VersionedTransaction } from "@solana/web3.js";

export const submitTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { signedTx } = req.body;

    if (!signedTx) {
      res.status(400).json({ error: "Missing required field: signedTx" });
      return
    }

    let bufferTx: Buffer;
    try {
      bufferTx = Buffer.from(signedTx, "base64");
    } catch (error) {
      res.status(400).json({
        error: "Invalid base64 encoding for signedTx",
      });
      return 
    }

    let transaction: VersionedTransaction;

    try {
      transaction = VersionedTransaction.deserialize(bufferTx);
    } catch (error: any) {
      res.status(400).json({
        error: `Failed to deserialize transaction: ${error.message}`,
      });
      return 
    }

    // Just forward it on-chain
    const txHash = await moonshotService.sendSignedTransaction(transaction);

    res.status(200).json({
      message: "Transaction submitted successfully",
      txHash,
    });

    return
  } catch (error) {
    console.error("Error in submitTransaction:", error);
    res.status(500).json({ error: "Internal server error" });
    return
  }
};
