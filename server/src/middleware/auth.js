import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "nexora-dev-secret-change-me";

export function signToken(user){
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET, { expiresIn: "12h" });
}

export function requireAuth(req, res, next){
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if(!token) return res.status(401).json({ error: "غير مصرح — الرجاء تسجيل الدخول" });
  try{
    req.user = jwt.verify(token, SECRET);
    next();
  }catch(e){
    return res.status(401).json({ error: "جلسة غير صالحة أو منتهية" });
  }
}
