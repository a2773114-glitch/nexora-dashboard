/* NEXORA dashboard — thin fetch wrapper against the real Express/lowdb backend */
const API_BASE = "/api";

function getToken(){ return localStorage.getItem("nexora_token"); }
function setToken(t){ localStorage.setItem("nexora_token", t); }
function clearToken(){ localStorage.removeItem("nexora_token"); localStorage.removeItem("nexora_user"); }
function getUser(){ try{ return JSON.parse(localStorage.getItem("nexora_user")); }catch(e){ return null; } }
function setUser(u){ localStorage.setItem("nexora_user", JSON.stringify(u)); }

async function api(path, { method="GET", body } = {}){
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if(token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if(res.status === 401){
    clearToken();
    if(!location.pathname.endsWith("login.html")) location.href = "login.html";
    throw new Error("غير مصرح");
  }

  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "حدث خطأ غير متوقع");
  return data;
}

window.NexoraAPI = { api, getToken, setToken, clearToken, getUser, setUser };
