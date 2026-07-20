(function(){
  const { api, getToken, clearToken, getUser } = window.NexoraAPI;

  if(!getToken()){ location.href = "login.html"; return; }

  const user = getUser();
  if(user){
    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-email").textContent = user.email;
    document.getElementById("user-avatar").textContent = (user.name||"N").trim().charAt(0);
  }

  document.getElementById("logout-btn").addEventListener("click", ()=>{
    clearToken();
    location.href = "login.html";
  });

  const mobileBtn = document.getElementById("mobile-menu-btn");
  mobileBtn && mobileBtn.addEventListener("click", ()=>{
    document.getElementById("sidebar").classList.toggle("open");
  });

  /* ---------------- toast ---------------- */
  function toast(msg, isError){
    let t = document.querySelector(".toast");
    if(!t){ t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    clearTimeout(window.__t);
    window.__t = setTimeout(()=>t.classList.remove("show"), 2800);
  }

  const fmt = n => Math.round(n).toLocaleString('en-US') + " SAR";
  const statusClass = s => ({
    "قيد المعالجة":"processing", "قيد الشحن":"shipped", "تم التسليم":"delivered", "ملغي":"cancelled",
    "منشور":"published",
  }[s] || "processing");
  const timeAgo = iso => {
    const diff = (Date.now() - new Date(iso).getTime())/1000;
    if(diff < 60) return "الآن";
    if(diff < 3600) return Math.floor(diff/60) + " دقيقة";
    if(diff < 86400) return Math.floor(diff/3600) + " ساعة";
    return Math.floor(diff/86400) + " يوم";
  };

  /* ---------------- routing ---------------- */
  const views = {
    overview: { title:"نظرة عامة", sub:"ملخص أداء نيكسورا اليوم", load: loadOverview },
    products: { title:"المنتجات", sub:"إدارة كتالوج المنتجات والمخزون", load: loadProducts, actions: productsActions },
    orders: { title:"الطلبات", sub:"متابعة وتحديث حالة الطلبات", load: loadOrders },
    customers: { title:"العملاء", sub:"قائمة العملاء وسجل مشترياتهم", load: loadCustomers },
    activity: { title:"سجل الأتمتة", sub:"الأحداث التلقائية وسجل النظام", load: loadActivity, actions: activityActions },
  };

  function navigate(){
    const hash = (location.hash || "#overview").replace("#","");
    const view = views[hash] ? hash : "overview";

    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    document.getElementById("view-"+view).classList.add("active");

    document.querySelectorAll(".sidebar-nav a").forEach(a=>a.classList.toggle("active", a.dataset.view === view));

    document.getElementById("page-title").textContent = views[view].title;
    document.getElementById("page-sub").textContent = views[view].sub;

    const actionsBox = document.getElementById("topbar-actions");
    actionsBox.innerHTML = "";
    if(views[view].actions) views[view].actions(actionsBox);

    views[view].load();
    document.getElementById("sidebar").classList.remove("open");
  }
  window.addEventListener("hashchange", navigate);

  /* ---------------- OVERVIEW ---------------- */
  async function loadOverview(){
    try{
      const s = await api("/stats/overview");
      document.getElementById("kpi-sales").textContent = fmt(s.totalSales);
      document.getElementById("kpi-orders").textContent = s.ordersCount;
      document.getElementById("kpi-customers").textContent = s.customersCount;
      document.getElementById("kpi-lowstock").textContent = s.lowStock.length;

      // bar chart (14 days)
      const max = Math.max(1, ...s.salesTimeline.map(d=>d.total));
      const chart = document.getElementById("sales-chart");
      chart.innerHTML = s.salesTimeline.map(d=>{
        const h = Math.max(3, Math.round((d.total/max)*140));
        const label = d.date.slice(5).replace("-","/");
        return `<div class="bar-col"><div class="bar" style="height:${h}px" title="${fmt(d.total)}"></div><div class="bar-label en">${label}</div></div>`;
      }).join("");

      // category breakdown
      const colors = ["#00C2B2","#D9B25C","#7C5CFF","#4ADE80"];
      const catMax = Math.max(1, ...s.salesByCategory.map(c=>c.total));
      const cat = document.getElementById("category-breakdown");
      cat.innerHTML = s.salesByCategory.map((c,i)=>`
        <div class="cat-row-wrap">
          <div class="cat-row">
            <span class="dot" style="background:${colors[i%colors.length]}"></span>
            <span class="name">${c.category}</span>
            <span class="val en">${fmt(c.total)}</span>
          </div>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(c.total/catMax)*100}%; background:${colors[i%colors.length]}"></div></div>
        </div>
      `).join("") || `<div class="empty-state">لا توجد بيانات مبيعات بعد</div>`;

      // recent orders
      const body = document.getElementById("recent-orders-body");
      body.innerHTML = s.recentOrders.map(o=>`
        <tr>
          <td class="cell-strong en">${o.orderNumber}</td>
          <td>${o.customerName}</td>
          <td class="en">${fmt(o.total)}</td>
          <td><span class="badge ${statusClass(o.status)}">${o.status}</span></td>
          <td class="en" style="color:var(--text-dim)">${timeAgo(o.createdAt)}</td>
        </tr>
      `).join("") || `<tr><td colspan="5" class="empty-state">لا توجد طلبات بعد</td></tr>`;
    }catch(e){ toast(e.message, true); }
  }

  /* ---------------- PRODUCTS ---------------- */
  let allProducts = [];

  function productsActions(box){
    const btn = document.createElement("button");
    btn.className = "btn-solid";
    btn.textContent = "+ إضافة منتج";
    btn.onclick = ()=> openProductModal();
    box.appendChild(btn);
  }

  async function loadProducts(){
    const q = document.getElementById("product-search").value.trim();
    const cat = document.getElementById("product-category-filter").value;
    try{
      const params = new URLSearchParams();
      if(q) params.set("q", q);
      if(cat) params.set("category", cat);
      const data = await api("/products?" + params.toString());
      allProducts = data.items;
      renderProducts(data.items);
    }catch(e){ toast(e.message, true); }
  }

  function renderProducts(items){
    const body = document.getElementById("products-body");
    body.innerHTML = items.map(p=>`
      <tr>
        <td>
          <div class="cell-strong">${p.name}</div>
          <div style="color:var(--text-dim); font-size:11.5px;" class="en">${p.sku}</div>
        </td>
        <td>${p.categoryLabel}</td>
        <td class="en">${fmt(p.price)}${p.oldPrice ? `<div style="color:var(--text-dim);text-decoration:line-through;font-size:11px;">${fmt(p.oldPrice)}</div>`:""}</td>
        <td class="en">
          ${p.stock}
          ${p.stock <= 5 ? `<span class="badge low" style="margin-inline-start:6px;">منخفض</span>` : ""}
        </td>
        <td><span class="badge ${statusClass(p.status)}">${p.status}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${p.id}" title="تعديل">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="icon-btn" data-del="${p.id}" title="حذف">
              <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="empty-state">لا توجد منتجات مطابقة</td></tr>`;

    body.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click", ()=>{
      const p = allProducts.find(p=>p.id===Number(b.dataset.edit));
      openProductModal(p);
    }));
    body.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click", async ()=>{
      const p = allProducts.find(p=>p.id===Number(b.dataset.del));
      if(!confirm(`هل تريد حذف "${p.name}"؟`)) return;
      try{
        await api(`/products/${p.id}`, { method:"DELETE" });
        toast("تم حذف المنتج");
        loadProducts();
      }catch(e){ toast(e.message, true); }
    }));
  }

  document.getElementById("product-search").addEventListener("input", debounce(loadProducts, 300));
  document.getElementById("product-category-filter").addEventListener("change", loadProducts);

  function openProductModal(p){
    document.getElementById("product-modal-title").textContent = p ? "تعديل المنتج" : "إضافة منتج جديد";
    document.getElementById("pf-id").value = p ? p.id : "";
    document.getElementById("pf-name").value = p ? p.name : "";
    document.getElementById("pf-category").value = p ? p.categorySlug : "furniture";
    document.getElementById("pf-sku").value = p ? p.sku : "";
    document.getElementById("pf-price").value = p ? p.price : "";
    document.getElementById("pf-oldprice").value = p && p.oldPrice ? p.oldPrice : "";
    document.getElementById("pf-stock").value = p ? p.stock : "";
    document.getElementById("pf-status").value = p ? p.status : "منشور";
    document.getElementById("pf-desc").value = p ? p.description : "";
    document.getElementById("product-modal").classList.add("show");
  }
  function closeProductModal(){ document.getElementById("product-modal").classList.remove("show"); }
  document.getElementById("pf-cancel").addEventListener("click", closeProductModal);
  document.getElementById("product-modal").addEventListener("click", (e)=>{
    if(e.target.id === "product-modal") closeProductModal();
  });

  document.getElementById("product-form").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const id = document.getElementById("pf-id").value;
    const payload = {
      name: document.getElementById("pf-name").value.trim(),
      categorySlug: document.getElementById("pf-category").value,
      sku: document.getElementById("pf-sku").value.trim(),
      price: Number(document.getElementById("pf-price").value),
      oldPrice: document.getElementById("pf-oldprice").value ? Number(document.getElementById("pf-oldprice").value) : null,
      stock: Number(document.getElementById("pf-stock").value),
      status: document.getElementById("pf-status").value,
      description: document.getElementById("pf-desc").value.trim(),
    };
    try{
      if(id) await api(`/products/${id}`, { method:"PUT", body: payload });
      else await api("/products", { method:"POST", body: payload });
      toast(id ? "تم تحديث المنتج" : "تمت إضافة المنتج");
      closeProductModal();
      loadProducts();
    }catch(e){ toast(e.message, true); }
  });

  /* ---------------- ORDERS ---------------- */
  async function loadOrders(){
    const status = document.getElementById("order-status-filter").value;
    try{
      const params = new URLSearchParams();
      if(status) params.set("status", status);
      const data = await api("/orders?" + params.toString());
      const body = document.getElementById("orders-body");
      body.innerHTML = data.items.map(o=>`
        <tr>
          <td class="cell-strong en">${o.orderNumber}</td>
          <td>${o.customerName}</td>
          <td class="en">${o.items.reduce((s,i)=>s+i.qty,0)}</td>
          <td class="en">${fmt(o.total)}</td>
          <td>${o.paymentMethod}</td>
          <td>
            <select class="status-select" data-order="${o.id}">
              ${["قيد المعالجة","قيد الشحن","تم التسليم","ملغي"].map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${s}</option>`).join("")}
            </select>
          </td>
          <td class="en" style="color:var(--text-dim)">${timeAgo(o.createdAt)}</td>
        </tr>
      `).join("") || `<tr><td colspan="7" class="empty-state">لا توجد طلبات</td></tr>`;

      body.querySelectorAll(".status-select").forEach(sel=>{
        sel.addEventListener("change", async ()=>{
          try{
            await api(`/orders/${sel.dataset.order}/status`, { method:"PUT", body:{ status: sel.value } });
            toast("تم تحديث حالة الطلب");
          }catch(e){ toast(e.message, true); }
        });
      });
    }catch(e){ toast(e.message, true); }
  }
  document.getElementById("order-status-filter").addEventListener("change", loadOrders);

  /* ---------------- CUSTOMERS ---------------- */
  async function loadCustomers(){
    try{
      const data = await api("/customers");
      const body = document.getElementById("customers-body");
      body.innerHTML = data.items.map(c=>`
        <tr>
          <td class="cell-strong">${c.name}</td>
          <td class="en">${c.email}</td>
          <td class="en">${c.phone}</td>
          <td>${c.city}</td>
          <td class="en">${c.ordersCount}</td>
          <td class="en">${fmt(c.totalSpent)}</td>
        </tr>
      `).join("") || `<tr><td colspan="6" class="empty-state">لا يوجد عملاء بعد</td></tr>`;
    }catch(e){ toast(e.message, true); }
  }

  /* ---------------- ACTIVITY / AUTOMATION ---------------- */
  function activityActions(box){
    const btn = document.createElement("button");
    btn.className = "btn-solid";
    btn.textContent = "تشغيل الأتمتة الآن";
    btn.onclick = async ()=>{
      try{
        await api("/activity/run-automation", { method:"POST" });
        toast("تم تشغيل مهام الأتمتة");
        loadActivity();
      }catch(e){ toast(e.message, true); }
    };
    box.appendChild(btn);
  }

  async function loadActivity(){
    try{
      const data = await api("/activity");
      const feed = document.getElementById("activity-feed");
      feed.innerHTML = data.items.map(a=>`
        <div class="activity-item">
          <div class="activity-dot ${a.type}"></div>
          <div>
            <div class="activity-text">${a.message}</div>
            <div class="activity-time en">${timeAgo(a.createdAt)}</div>
          </div>
        </div>
      `).join("") || `<div class="empty-state">لا يوجد نشاط بعد</div>`;
    }catch(e){ toast(e.message, true); }
  }

  function debounce(fn, ms){
    let t;
    return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
  }

  navigate();
})();
