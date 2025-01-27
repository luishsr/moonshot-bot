import express from "express";
import { config } from "./utils/env";
import tradingRoutes from "./routes/tradingRoutes";

const app = express();
const port = config.PORT;

app.use(express.json());
app.use("/api/trading", tradingRoutes);

// Start the server only if it's not being tested
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

export default app; // Export the app instance for testing
