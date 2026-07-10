const $ = (selector) => document.querySelector(selector);
let products = [];

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a ação.");
  return payload;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[c]);
}

function status(product) {
  if (product.quantity === 0) return ["Esgotado", "out"];
  if (product.quantity <= product.minimum) return ["Estoque baixo", "low"];
  return ["Em dia", "good"];
}

function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.style.background = error ? "var(--danger)" : "var(--success)";
  el.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove("show"), 3100);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [date, time] = dateString.split(" ");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}${time ? ` às ${time}` : ""}`;
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  $("#metric-catalog").textContent = data.catalog;
  $("#metric-units").textContent = `${data.units} unidades em estoque`;
  $("#metric-critical").textContent = data.critical;
  $("#metric-requests").textContent = data.open_requests;
  $("#low-list").innerHTML = data.low.length ? data.low.map(p => {
    const missing = Math.max(0, p.minimum - p.quantity);
    return `<div class="compact-item"><span class="circle red">!</span><div><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.category)} · mínimo: ${p.minimum} ${escapeHtml(p.unit)}</small></div><span class="item-value">${p.quantity === 0 ? "ZERADO" : `${missing} faltando`}</span></div>`;
  }).join("") : '<p class="empty">Nenhum item precisa de reposição agora.</p>';
  $("#wanted-list").innerHTML = data.wanted.length ? data.wanted.map((r, i) => `<div class="compact-item"><span class="circle">${i + 1}</span><div><b>${escapeHtml(r.item)}</b><small>${r.times} ${r.times === 1 ? "registro" : "registros"} em aberto</small></div><span class="item-value normal">${r.requested} un.</span></div>`).join("") : '<p class="empty">Ainda não há procuras em aberto.</p>';
}

function renderProducts() {
  const needle = $("#product-search").value.trim().toLowerCase();
  const shown = products.filter(p => `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(needle));
  $("#product-count").textContent = `${shown.length} produto${shown.length === 1 ? "" : "s"}`;
  $("#products-body").innerHTML = shown.length ? shown.map(p => {
    const [label, kind] = status(p);
    return `<tr><td><b>${escapeHtml(p.name)}</b></td><td>${escapeHtml(p.category)}</td><td><small>${escapeHtml(p.sku || "—")}</small></td><td class="stock">${p.quantity} <small>${escapeHtml(p.unit)}</small></td><td>${p.minimum} ${escapeHtml(p.unit)}</td><td><span class="badge ${kind}">${label}</span></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>';
}

async function loadProducts() {
  products = await api("/api/products");
  renderProducts();
  $("#movement-product").innerHTML = '<option value="">Selecione o produto</option>' + products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ${p.quantity} ${escapeHtml(p.unit)}</option>`).join("");
}

async function loadRequests() {
  const rows = await api("/api/requests");
  $("#request-list").innerHTML = rows.length ? rows.map(r => {
    const isOpen = r.status === 'aberta';
    return `<div class="request-row">
      <span class="circle ${isOpen ? 'red' : ''}">${r.quantity}x</span>
      <div>
        <h4>${escapeHtml(r.item)}</h4>
        <p>${r.customer ? escapeHtml(r.customer) + ' · ' : ''}${r.phone ? escapeHtml(r.phone) + ' · ' : ''}${formatDate(r.created_at)}${r.note ? ' · ' + escapeHtml(r.note) : ''}</p>
      </div>
      <span class="badge ${isOpen ? 'low' : 'good'}">${isOpen ? 'Em aberto' : 'Atendida'}</span>
      ${isOpen ? `<button class="btn-increment" data-increment-request="${r.id}" title="Mais um cliente procurou este item">+1</button>` : ''}
      ${isOpen ? `<button data-close-request="${r.id}">Atendida ✓</button>` : ''}
    </div>`;
  }).join('') : '<p class="empty">Nenhuma procura anotada ainda.</p>';
}

function printReport() {
  const label = document.getElementById('print-title-label');
  const date = document.getElementById('print-date');
  if (label) label.textContent = 'RELATÓRIO DE FALTAS E REPOSIÇÃO';
  if (date) date.textContent = 'Gerado em: ' + new Intl.DateTimeFormat('pt-BR', {dateStyle: 'long', timeStyle: 'short'}).format(new Date());
  window.print();
}

function printRequests() {
  const label = document.getElementById('print-title-label');
  const date = document.getElementById('print-date');
  if (label) label.textContent = 'RELATÓRIO DE PROCURAS DE CLIENTES';
  if (date) date.textContent = 'Gerado em: ' + new Intl.DateTimeFormat('pt-BR', {dateStyle: 'long', timeStyle: 'short'}).format(new Date());
  window.print();
}

async function loadReport() {
  const rows = await api("/api/report/missing");
  $("#report-summary").textContent = rows.length ? `${rows.length} produto${rows.length === 1 ? " precisa" : "s precisam"} de atenção. Priorize os itens zerados e use esta lista na compra.` : "Tudo certo: não há itens no nível mínimo.";
  $("#report-body").innerHTML = rows.length ? rows.map(p => {
    const out = p.quantity === 0;
    return `<tr><td><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.sku || "Sem código")}</small></td><td>${escapeHtml(p.category)}</td><td class="stock">${p.quantity} ${escapeHtml(p.unit)}</td><td>${p.minimum} ${escapeHtml(p.unit)}</td><td><b>${p.shortage > 0 ? p.shortage : 0} ${escapeHtml(p.unit)}</b></td><td><span class="badge ${out ? "out" : "low"}">${out ? "Urgente" : "Comprar"}</span></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty">Não há faltas para relatar.</td></tr>';
}

async function refreshAll() {
  try { await Promise.all([loadDashboard(), loadProducts(), loadRequests(), loadReport()]); }
  catch (err) { toast(err.message, true); }
}

function openModal(id) { $("#" + id).classList.add("open"); }
function closeModals() { document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("open")); }

function goTo(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === page));
  document.querySelectorAll(".nav-link").forEach(n => n.classList.toggle("active", n.dataset.page === page));
  const names = {dashboard: "Bom dia, equipe.", products: "Controle de estoque", requests: "O que o cliente procura", report: "Relatório de reposição"};
  $("#page-title").textContent = names[page];
  window.scrollTo({top: 0, behavior: "smooth"});
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest(".nav-link");
  if (nav) goTo(nav.dataset.page);
  const goto = event.target.closest("[data-goto]");
  if (goto) goTo(goto.dataset.goto);
  const opener = event.target.closest("[data-open]");
  if (opener) openModal(opener.dataset.open);
  if (event.target.matches("[data-close]") || event.target.classList.contains("modal-backdrop")) closeModals();
  const closeButton = event.target.closest("[data-close-request]");
  if (closeButton) {
    try { await api(`/api/requests?action=close&id=${closeButton.dataset.closeRequest}`, {method: "POST"}); toast("Procura marcada como atendida."); await refreshAll(); }
    catch (err) { toast(err.message, true); }
  }
  const incrementBtn = event.target.closest("[data-increment-request]");
  if (incrementBtn) {
    try { 
      const res = await api(`/api/requests?action=increment&id=${incrementBtn.dataset.incrementRequest}`, {method: "POST"});
      toast(`✅ Mais uma procura registrada! Total: ${res.quantity}x`);
      await refreshAll();
    }
    catch (err) { toast(err.message, true); }
  }
});

$("#product-search").addEventListener("input", renderProducts);

$("#product-form").addEventListener("submit", async event => {
  event.preventDefault();
  try { await api("/api/products", {method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target)))}); event.target.reset(); closeModals(); toast("Produto cadastrado com sucesso."); await refreshAll(); }
  catch (err) { toast(err.message, true); }
});
$("#movement-form").addEventListener("submit", async event => {
  event.preventDefault();
  try { await api("/api/movements", {method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target)))}); event.target.reset(); closeModals(); toast("Movimentação registrada."); await refreshAll(); }
  catch (err) { toast(err.message, true); }
});
$("#request-form").addEventListener("submit", async event => {
  event.preventDefault();
  try { await api("/api/requests", {method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target)))}); event.target.reset(); closeModals(); toast("Procura anotada. Excelente!"); await refreshAll(); }
  catch (err) { toast(err.message, true); }
});

$("#today").textContent = new Intl.DateTimeFormat("pt-BR", {weekday:"long", day:"2-digit", month:"long"}).format(new Date());
refreshAll();
