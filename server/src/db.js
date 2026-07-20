import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "data", "db.json");

const defaultData = {
  users: [],
  products: [],
  customers: [],
  orders: [],
  activity: [],
  meta: { nextId: { users: 1, products: 1, customers: 1, orders: 1, activity: 1 } },
};

const adapter = new JSONFile(file);
export const db = new Low(adapter, defaultData);

export async function initDb(){
  await db.read();
  db.data ||= structuredClone(defaultData);
  db.data.meta ||= structuredClone(defaultData.meta);
  await db.write();
  return db;
}

export function nextId(collection){
  const id = db.data.meta.nextId[collection]++;
  return id;
}

export async function logActivity(type, message){
  db.data.activity.unshift({
    id: nextId("activity"),
    type,
    message,
    createdAt: new Date().toISOString(),
  });
  db.data.activity = db.data.activity.slice(0, 100); // keep log bounded
  await db.write();
}
