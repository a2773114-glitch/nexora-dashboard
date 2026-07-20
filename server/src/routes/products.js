import { Router } from "express";
import { db, nextId, logActivity } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const CATS = {
  furniture: "أثاث وديكور",
  electronics: "إلكترونيات",
  accessories: "إكسسوارات",
  exclusive: "منتجات حصرية",
};

router.use(requireAuth);

router.get("/", (req, res) => {
  const { category, q } = req.query;
  let items = db.data.products;
  if(category) items = items.filter(p => p.categorySlug === category);
  if(q) items = items.filter(p => p.name.includes(q) || (p.sku||"").toLowerCase().includes(String(q).toLowerCase()));
  res.json({ items, categories: CATS });
});

router.get("/:id", (req, res) => {
  const p = db.data.products.find(p => p.id === Number(req.params.id));
  if(!p) return res.status(404).json({ error: "المنتج غير موجود" });
  res.json({ item: p });
});

router.post("/", async (req, res) => {
  const { name, categorySlug, price, oldPrice, stock, sku, description, status } = req.body || {};
  if(!name || !categorySlug || price == null) return res.status(400).json({ error: "الاسم والفئة والسعر مطلوبة" });
  const product = {
    id: nextId("products"),
    name,
    categorySlug,
    categoryLabel: CATS[categorySlug] || categorySlug,
    price: Number(price),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    stock: Number(stock) || 0,
    sku: sku || ("NEX-" + Date.now()),
    status: status || "منشور",
    description: description || "",
    createdAt: new Date().toISOString(),
  };
  db.data.products.push(product);
  await db.write();
  await logActivity("product", `تمت إضافة منتج جديد: ${product.name}`);
  res.status(201).json({ item: product });
});

router.put("/:id", async (req, res) => {
  const idx = db.data.products.findIndex(p => p.id === Number(req.params.id));
  if(idx === -1) return res.status(404).json({ error: "المنتج غير موجود" });
  const body = req.body || {};
  const p = db.data.products[idx];
  const updated = {
    ...p,
    ...body,
    price: body.price != null ? Number(body.price) : p.price,
    oldPrice: body.oldPrice !== undefined ? (body.oldPrice ? Number(body.oldPrice) : null) : p.oldPrice,
    stock: body.stock != null ? Number(body.stock) : p.stock,
    categoryLabel: body.categorySlug ? (CATS[body.categorySlug] || body.categorySlug) : p.categoryLabel,
  };
  db.data.products[idx] = updated;
  await db.write();
  await logActivity("product", `تم تعديل بيانات المنتج: ${updated.name}`);
  res.json({ item: updated });
});

router.delete("/:id", async (req, res) => {
  const idx = db.data.products.findIndex(p => p.id === Number(req.params.id));
  if(idx === -1) return res.status(404).json({ error: "المنتج غير موجود" });
  const [removed] = db.data.products.splice(idx, 1);
  await db.write();
  await logActivity("product", `تم حذف المنتج: ${removed.name}`);
  res.json({ ok: true });
});

export default router;
