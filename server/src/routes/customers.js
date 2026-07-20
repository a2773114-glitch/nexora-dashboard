import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const items = db.data.customers.map(c => {
    const orders = db.data.orders.filter(o => o.customerId === c.id);
    const totalSpent = orders.reduce((s,o)=>s+o.total,0);
    return { ...c, ordersCount: orders.length, totalSpent };
  });
  res.json({ items });
});

export default router;
