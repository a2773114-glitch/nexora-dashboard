import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });

  const user = db.data.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if(!user) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if(!ok) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
