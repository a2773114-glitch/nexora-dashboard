import bcrypt from "bcryptjs";
import { db, initDb, nextId, logActivity } from "./db.js";

const CATS = {
  furniture: "أثاث وديكور",
  electronics: "إلكترونيات",
  accessories: "إكسسوارات",
  exclusive: "منتجات حصرية",
};

const products = [
  { name: "كرسي مكتب ذكي", category: "furniture", price: 749, oldPrice: 899, stock: 18, sku: "NEX-FUR-001" },
  { name: "طاولة قهوة قابلة للطي", category: "furniture", price: 520, oldPrice: null, stock: 2, sku: "NEX-FUR-002" },
  { name: "رف إضاءة حائطي ذكي", category: "furniture", price: 310, oldPrice: null, stock: 24, sku: "NEX-FUR-003" },
  { name: "سماعة لاسلكية ذكية", category: "electronics", price: 599, oldPrice: 699, stock: 40, sku: "NEX-ELE-001" },
  { name: "شاشة عرض ذكية", category: "electronics", price: 1290, oldPrice: null, stock: 6, sku: "NEX-ELE-002" },
  { name: "مكبر صوت منزلي ذكي", category: "electronics", price: 430, oldPrice: null, stock: 1, sku: "NEX-ELE-003" },
  { name: "خاتم ذكي متعدد الوظائف", category: "accessories", price: 349, oldPrice: null, stock: 33, sku: "NEX-ACC-001" },
  { name: "سوار تتبع اللياقة", category: "accessories", price: 279, oldPrice: 329, stock: 15, sku: "NEX-ACC-002" },
  { name: "مكعّب الإضاءة الذكي", category: "exclusive", price: 899, oldPrice: 1199, stock: 9, sku: "NEX-EXC-001" },
  { name: "نسخة محدودة ذهبية", category: "exclusive", price: 2400, oldPrice: null, stock: 3, sku: "NEX-EXC-002" },
];

const customers = [
  { name: "أحمد العتيبي", email: "ahmed.o@example.com", phone: "0551234567", city: "الرياض" },
  { name: "سارة القحطاني", email: "sara.q@example.com", phone: "0559876543", city: "جدة" },
  { name: "محمد الدوسري", email: "m.dosari@example.com", phone: "0561122334", city: "الدمام" },
  { name: "نورة المطيري", email: "noura.m@example.com", phone: "0567788990", city: "الرياض" },
];

const statuses = ["قيد المعالجة", "قيد الشحن", "تم التسليم", "ملغي"];
const paymentMethods = ["بطاقة ائتمان", "Apple Pay", "مدى", "STC Pay"];

async function seed(){
  await initDb();

  db.data.users = [];
  db.data.products = [];
  db.data.customers = [];
  db.data.orders = [];
  db.data.activity = [];
  db.data.meta.nextId = { users: 1, products: 1, customers: 1, orders: 1, activity: 1 };

  // admin user
  const passwordHash = bcrypt.hashSync("Nexora@123", 10);
  db.data.users.push({
    id: nextId("users"),
    name: "مدير نيكسورا",
    email: "admin@nexora.com",
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString(),
  });

  // products
  const productRecords = products.map(p => ({
    id: nextId("products"),
    name: p.name,
    categorySlug: p.category,
    categoryLabel: CATS[p.category],
    price: p.price,
    oldPrice: p.oldPrice,
    stock: p.stock,
    sku: p.sku,
    status: "منشور",
    description: `منتج ذكي من فئة ${CATS[p.category]} — يعرض ثلاثي الأبعاد في الموقع.`,
    createdAt: new Date().toISOString(),
  }));
  db.data.products = productRecords;

  // customers
  const customerRecords = customers.map(c => ({
    id: nextId("customers"),
    ...c,
    createdAt: new Date().toISOString(),
  }));
  db.data.customers = customerRecords;

  // orders (randomized against seeded products/customers)
  const orderRecords = [];
  for(let i=0;i<12;i++){
    const customer = customerRecords[i % customerRecords.length];
    const itemCount = 1 + (i % 3);
    const items = [];
    for(let j=0;j<itemCount;j++){
      const p = productRecords[(i+j) % productRecords.length];
      const qty = 1 + (j % 2);
      items.push({ productId: p.id, name: p.name, price: p.price, qty });
    }
    const total = items.reduce((s,it)=>s + it.price*it.qty, 0);
    const daysAgo = i * 2;
    const date = new Date(Date.now() - daysAgo*24*3600*1000);
    orderRecords.push({
      id: nextId("orders"),
      orderNumber: "NEX-" + (10230 + i),
      customerId: customer.id,
      customerName: customer.name,
      items,
      total,
      status: statuses[i % statuses.length],
      paymentMethod: paymentMethods[i % paymentMethods.length],
      createdAt: date.toISOString(),
    });
  }
  db.data.orders = orderRecords;

  await db.write();

  await logActivity("system", "تمت تهيئة قاعدة البيانات وتعبئتها ببيانات تجريبية.");
  await logActivity("automation", "تنبيه تلقائي: تم رصد 3 منتجات بمخزون منخفض (أقل من 5 قطع).");
  await logActivity("automation", "تذكير تلقائي: تم إرسال إشعار سلة متروكة لعميل واحد.");
  await logActivity("order", "تم استلام طلب جديد رقم NEX-10241.");

  console.log("✔ تمت تعبئة قاعدة البيانات بنجاح.");
  console.log("  بيانات الدخول: admin@nexora.com / Nexora@123");
}

seed();
