Moonshot Trading Bot Example
============================

A simple Solana-based trading bot terminal using the [Moonshot SDK](https://github.com/wen-moon-ser/moonshot) on Devnet. This project provides a REST API to prepare and submit transactions (buy or sell) and includes a 1% SOL fee instruction.

Overview
--------

1.  **Endpoints**

    -   `POST /api/trading/prepare`\
        Creates an unsigned transaction for a buy or sell using the Moonshot program.\
        Also includes a 1% fee transfer from the user to the fee wallet.
    -   `POST /api/trading/submit`\
        Accepts a **signed** transaction in base64, deserializes it, and submits it on-chain.
2.  **Solana Transaction Flow**

    -   **Prepare**:

        1.  The user calls `/api/trading/prepare` with `{ userWallet, tradeType, amount }`.
        2.  The API builds an **unsigned** `VersionedTransaction` with the buy/sell instructions plus a 1% SOL fee instruction.
        3.  The API returns that **unsigned** transaction in base64.
    -   **User Signs**

        1.  Client (or a script) deserializes the base64-encoded transaction, signs with the user's keypair, and re-serializes to base64.
    -   **Submit**:

        1.  The user (or script) calls `/api/trading/submit` with `signedTx` (base64).
        2.  The API deserializes, checks validity, and broadcasts the transaction to the Solana devnet.

Requirements
------------

-   **Node.js** v16+
-   **Typescript**
-   **Solana CLI** (optional for local signing/testing)
-   **Devnet SOL** in the user's wallet

Getting Started
---------------

1.  **Install Dependencies**

    `npm install`

2.  **Configure Environment**\
    Create a `.env` file with:

    `RPC_URL=https://api.devnet.solana.com
    USER_WALLET=yourUserPublicKey
    FEE_WALLET=yourFeeWalletPublicKey`

    Adjust accordingly for your devnet settings.

3.  **Run Tests**

    `npm run test`

    This will run the Jest integration tests that prepare and submit example transactions.

4.  **Build & Launch**

    `npm run build
    npm start`

    By default, the server listens on port 3000 (or whichever your code sets).

Project Structure
-----------------

-   **`src/controllers/prepareController.ts`**\
    Handles `POST /api/trading/prepare`.
-   **`src/controllers/submitController.ts`**\
    Handles `POST /api/trading/submit`.
-   **`src/services/moonshotService.ts`**\
    Encapsulates Moonshot SDK logic, creating instructions for buy/sell and sending signed transactions.
-   **`src/tests/integration/tradingBot.test.ts`**\
    Contains Jest tests to verify the entire flow.

Usage (Example cURL Requests)
-----------------------------

### Prepare

`curl -X POST\
  http://localhost:3000/api/trading/prepare\
  -H "Content-Type: application/json"\
  -d '{
    "userWallet": "YourUserPublicKey",
    "tradeType": "buy",
    "amount": 1000
  }'`

-   Returns an **unsigned** transaction in base64.

### Sign Transaction

-   Deserialization and signing typically happen client-side or via a script.
-   If using Solana CLI ≥1.14, you can decode and sign:

    `echo "BASE64_UNSIGNED_TX" | base64 -d > unsigned_tx.bin
    solana sign --keypair yourKeypair.json unsigned_tx.bin --output signed_tx.bin
    base64 signed_tx.bin > signed_tx.b64`

### Submit

`curl -X POST\
  http://localhost:3000/api/trading/submit\
  -H "Content-Type: application/json"\
  -d '{
    "signedTx": "BASE64_SIGNED_TX"
  }'`

-   Returns `{"message":"Transaction submitted successfully","txHash":"...signature..."}`.
