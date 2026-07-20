import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db.js";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import customerRoutes from "./routes/customers.js";
import statsRoutes from "./routes/stats.js";
import activityRoutes from "./routes/activity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/activity", activityRoutes);

app.use(express.static(PUBLIC_DIR));
app.get("/", (req, res) => res.redirect("/login.html"));

const PORT = process.env.PORT || 4000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✔ NEXORA dashboard server running: http://localhost:${PORT}`);
  });
});
