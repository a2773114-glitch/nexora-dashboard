import { Router } from "express";
import { db, logActivity } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  res.json({ items: db.data.activity.slice(0, 30) });
});

// Manual trigger to simulate the automation engine described in the business plan
router.post("/run-automation", async (req, res) => {
  const lowStock = db.data.products.filter(p => p.stock <= 5);
  if(lowStock.length){
    await logActivity("automation", `تشغيل يدوي: تنبيه مخزون منخفض لـ ${lowStock.length} منتج (${lowStock.map(p=>p.name).join("، ")}).`);
  }
  const processing = db.data.orders.filter(o => o.status === "قيد المعالجة");
  if(processing.length){
    await logActivity("automation", `تشغيل يدوي: تم إرسال تذكير متابعة لـ ${processing.length} طلب قيد المعالجة.`);
  }
  await logActivity("automation", "تشغيل يدوي: تم إرسال تقرير أداء تلقائي إلى البريد الإداري.");
  res.json({ items: db.data.activity.slice(0, 30) });
});

export default router;
