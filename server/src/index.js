import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, db } from "./db.js";
import { seed } from "./seed.js";

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

initDb().then(async () => {
  // Self-heal: on platforms with an ephemeral filesystem (e.g. free hosting tiers),
  // the data file can come back empty after a restart. If there's no admin user,
  // re-seed automatically so login always works without a manual redeploy.
  if (!db.data.users || db.data.users.length === 0) {
    console.log("⚠ لا يوجد مستخدمون في قاعدة البيانات — يتم تعبئتها تلقائيًا...");
    await seed();
  }
  app.listen(PORT, () => {
    console.log(`✔ NEXORA dashboard server running: http://localhost:${PORT}`);
  });
});
