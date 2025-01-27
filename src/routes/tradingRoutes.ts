import express from "express";
import { prepareTransaction } from "../controllers/prepareController";
import { submitTransaction } from "../controllers/submitController";

const router = express.Router();

router.post("/prepare", prepareTransaction);
router.post("/submit", submitTransaction);

export default router;
