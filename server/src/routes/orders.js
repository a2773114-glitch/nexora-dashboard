import { Router } from "express";
import { db, logActivity } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { status } = req.query;
  let items = [...db.data.orders].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  if(status) items = items.filter(o => o.status === status);
  res.json({ items });
});

router.get("/:id", (req, res) => {
  const o = db.data.orders.find(o => o.id === Number(req.params.id));
  if(!o) return res.status(404).json({ error: "الطلب غير موجود" });
  res.json({ item: o });
});

router.put("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  const idx = db.data.orders.findIndex(o => o.id === Number(req.params.id));
  if(idx === -1) return res.status(404).json({ error: "الطلب غير موجود" });
  db.data.orders[idx].status = status;
  await db.write();
  await logActivity("order", `تم تحديث حالة الطلب ${db.data.orders[idx].orderNumber} إلى: ${status}`);
  if(status === "قيد الشحن"){
    await logActivity("automation", `إشعار تلقائي: تم إرسال رسالة تتبع الشحنة للعميل بخصوص الطلب ${db.data.orders[idx].orderNumber}.`);
  }
  res.json({ item: db.data.orders[idx] });
});

export default router;
