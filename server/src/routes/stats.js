import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/overview", (req, res) => {
  const products = db.data.products;
  const orders = db.data.orders;
  const customers = db.data.customers;

  const totalSales = orders.filter(o=>o.status !== "ملغي").reduce((s,o)=>s+o.total,0);
  const ordersCount = orders.length;
  const productsCount = products.length;
  const customersCount = customers.length;
  const lowStock = products.filter(p => p.stock <= 5);

  // sales by category
  const catTotals = {};
  orders.forEach(o=>{
    if(o.status === "ملغي") return;
    o.items.forEach(it=>{
      const p = products.find(p=>p.id === it.productId);
      const cat = p ? p.categoryLabel : "أخرى";
      catTotals[cat] = (catTotals[cat]||0) + it.price*it.qty;
    });
  });
  const salesByCategory = Object.entries(catTotals).map(([category,total])=>({category,total}));

  // sales last 7 buckets (by 2-day step over seeded data range) — simple day-by-day over last 14 days
  const days = [];
  for(let i=13;i>=0;i--){
    const d = new Date(Date.now() - i*24*3600*1000);
    const key = d.toISOString().slice(0,10);
    const dayTotal = orders.filter(o=>o.createdAt.slice(0,10) === key && o.status !== "ملغي")
      .reduce((s,o)=>s+o.total,0);
    days.push({ date: key, total: dayTotal });
  }

  const statusCounts = {};
  orders.forEach(o=>{ statusCounts[o.status] = (statusCounts[o.status]||0) + 1; });

  const recentOrders = [...orders].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);

  res.json({
    totalSales, ordersCount, productsCount, customersCount,
    lowStock, salesByCategory, salesTimeline: days, statusCounts, recentOrders,
  });
});

export default router;
