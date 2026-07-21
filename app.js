const $ = (s) => document.querySelector(s);
let products = [];
let searchDebounce = null;
let requestsData = [];
let requestSearchDebounce = null;

// ─── API ────────────────────────────────────────────────────────────────────
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
  return data;
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────
const ESC = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
const escapeHtml = (v = '') => String(v).replace(/[&<>"']/g, c => ESC[c]);

function productStatus(p) {
  if (p.quantity === 0) return ['Esgotado', 'out'];
  if (p.quantity <= p.minimum) return ['Estoque baixo', 'low'];
  return ['Em dia', 'good'];
}

function toast(msg, error = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.style.background = error ? 'var(--danger)' : 'var(--success)';
  el.classList.add('show');
  clearTimeout(window._toast);
  window._toast = setTimeout(() => el.classList.remove('show'), 3000);
}

function fmtDate(d) {
  if (!d) return '';
  // Suporta formato ISO (2026-07-10T09:22:00Z) e o formato antigo (2026-07-10 09:22)
  const dt = new Date(d.includes('T') ? d : d.replace(' ', 'T'));
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  const data = await api('/api/dashboard');
  $('#metric-catalog').textContent = data.catalog;
  $('#metric-units').textContent = `${data.units} unidades em estoque`;
  $('#metric-critical').textContent = data.critical;
  $('#metric-requests').textContent = data.open_requests;

  $('#low-list').innerHTML = data.low.length
    ? data.low.map(p => {
        const label = p.quantity === 0 ? 'ZERADO' : `Tem ${p.quantity} ${escapeHtml(p.unit)}`;
        return `<div class="compact-item"><span class="circle red">!</span><div><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.category)} · mín: ${p.minimum} ${escapeHtml(p.unit)}</small></div><span class="item-value">${label}</span></div>`;
      }).join('')
    : '<p class="empty">Nenhum item precisa de reposição agora.</p>';

  $('#wanted-list').innerHTML = data.wanted.length
    ? data.wanted.map((r, i) =>
        `<div class="compact-item"><span class="circle">${i+1}</span><div><b>${escapeHtml(r.item)}</b><small>${r.times} ${r.times === 1 ? 'registro' : 'registros'} em aberto</small></div><span class="item-value normal">${r.requested} un.</span></div>`
      ).join('')
    : '<p class="empty">Ainda não há procuras em aberto.</p>';
}

// ─── ESTOQUE ─────────────────────────────────────────────────────────────────
function renderProducts() {
  const needle = $('#product-search').value.trim().toLowerCase();
  const shown = needle
    ? products.filter(p => `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(needle))
    : products;
  $('#product-count').textContent = `${shown.length} produto${shown.length !== 1 ? 's' : ''}`;
  $('#products-body').innerHTML = shown.length
    ? shown.map(p => {
        const [label, kind] = productStatus(p);
        return `<tr><td><b>${escapeHtml(p.name)}</b></td><td>${escapeHtml(p.category)}</td><td><small>${escapeHtml(p.sku || '—')}</small></td><td class="stock">${p.quantity} <small>${escapeHtml(p.unit)}</small></td><td>${p.minimum} ${escapeHtml(p.unit)}</td><td><span class="badge ${kind}">${label}</span></td></tr>`;
      }).join('')
    : '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>';
}

async function loadProducts() {
  products = await api('/api/products');
  renderProducts();
  $('#movement-product').innerHTML = '<option value="">Selecione o produto</option>'
    + products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ${p.quantity} ${escapeHtml(p.unit)}</option>`).join('');
}

// ─── PROCURAS ────────────────────────────────────────────────────────────────
function renderRequests() {
  const needle = $('#request-search').value.trim().toLowerCase();
  const shown = needle
    ? requestsData.filter(r => `${r.item} ${r.customer || ''} ${r.phone || ''} ${r.note || ''}`.toLowerCase().includes(needle))
    : requestsData;
  
  $('#request-count').textContent = `${shown.length} procura${shown.length !== 1 ? 's' : ''}`;
  $('#request-list').innerHTML = shown.length
    ? shown.map(r => {
        const open = r.status === 'aberta';
        return `<div class="request-row">
          <input type="checkbox" class="request-checkbox" data-quantity="${r.quantity}" value="${r.id}" />
          <span class="circle ${open ? 'red' : ''}">${r.quantity}x</span>
          <div>
            <h4>${escapeHtml(r.item)}</h4>
            <p>${r.customer ? escapeHtml(r.customer) + ' · ' : ''}${r.phone ? escapeHtml(r.phone) + ' · ' : ''}${fmtDate(r.created_at)}${r.note ? ' · ' + escapeHtml(r.note) : ''}</p>
          </div>
          <span class="badge ${open ? 'low' : 'good'}">${open ? 'Em aberto' : 'Atendida'}</span>
          ${open ? `<button class="btn-increment" data-increment-request="${r.id}" title="Mais um cliente procurou este item">+1</button>` : ''}
          ${open ? `<button data-close-request="${r.id}">Atendida ✓</button>` : ''}
        </div>`;
      }).join('')
    : '<p class="empty">Nenhuma procura encontrada.</p>';
}

async function loadRequests() {
  requestsData = await api('/api/requests');
  renderRequests();
}

// ─── RELATÓRIO ───────────────────────────────────────────────────────────────
async function loadReport() {
  const rows = await api('/api/report/missing');
  $('#report-summary').textContent = rows.length
    ? `${rows.length} produto${rows.length !== 1 ? 's precisam' : ' precisa'} de atenção. Priorize os zerados na compra.`
    : 'Tudo certo: não há itens no nível mínimo.';
  $('#report-body').innerHTML = rows.length
    ? rows.map(p => {
        const out = p.quantity === 0;
        return `<tr><td><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.sku || 'Sem código')}</small></td><td>${escapeHtml(p.category)}</td><td class="stock">${p.quantity} ${escapeHtml(p.unit)}</td><td>${p.minimum} ${escapeHtml(p.unit)}</td><td><b>${p.shortage > 0 ? p.shortage : 0} ${escapeHtml(p.unit)}</b></td><td><span class="badge ${out ? 'out' : 'low'}">${out ? 'Urgente' : 'Comprar'}</span></td></tr>`;
      }).join('')
    : '<tr><td colspan="6" class="empty">Não há faltas para relatar.</td></tr>';
}

// ─── IMPRESSÃO ───────────────────────────────────────────────────────────────
function setPrintHeader(title) {
  const now = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  $('#print-title-label').textContent = title;
  $('#print-date').textContent = 'Gerado em: ' + now;
}

function clearPrintHide() {
  document.querySelectorAll('.request-row').forEach(row => row.classList.remove('print-hide'));
}

function printReport() { setPrintHeader('RELATÓRIO DE FALTAS E REPOSIÇÃO'); window.print(); }

function printRequests() { 
  clearPrintHide();
  setPrintHeader('RELATÓRIO DE PROCURAS DE CLIENTES'); 
  window.print(); 
}

function printSelectedRequests() {
  const checkboxes = document.querySelectorAll('.request-checkbox');
  let selectedCount = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedCount++;
      cb.closest('.request-row').classList.remove('print-hide');
    } else {
      cb.closest('.request-row').classList.add('print-hide');
    }
  });
  
  if (selectedCount === 0) {
    toast('Selecione pelo menos um item para imprimir', true);
    clearPrintHide();
    return;
  }
  
  setPrintHeader('PROCURAS DE CLIENTES (SELECIONADOS)');
  window.print();
}

function selectMultipleRequests() {
  document.querySelectorAll('.request-checkbox').forEach(cb => {
    if (parseInt(cb.dataset.quantity) >= 2) cb.checked = true;
  });
  toast('Itens com 2 ou mais procuras selecionados!');
}

window.addEventListener('afterprint', clearPrintHide);

// ─── REFRESH ─────────────────────────────────────────────────────────────────
async function refreshAll() {
  try { await Promise.all([loadDashboard(), loadProducts(), loadRequests(), loadReport()]); }
  catch (err) { toast(err.message, true); }
}

async function refreshPartial() {
  try { await Promise.all([loadDashboard(), loadRequests()]); }
  catch (err) { toast(err.message, true); }
}

// ─── MODAIS ──────────────────────────────────────────────────────────────────
function openModal(id)  { $('#' + id).classList.add('open'); }
function closeModals()  { document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open')); }

// ─── NAVEGAÇÃO ───────────────────────────────────────────────────────────────
const PAGE_TITLES = { dashboard: 'Bom dia, equipe.', products: 'Controle de estoque', requests: 'O que o cliente procura', report: 'Relatório de reposição' };

function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === page));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  $('#page-title').textContent = PAGE_TITLES[page] || page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── EVENTOS ─────────────────────────────────────────────────────────────────
document.addEventListener('click', async (e) => {
  const nav = e.target.closest('.nav-link');
  if (nav) return goTo(nav.dataset.page);

  const go = e.target.closest('[data-goto]');
  if (go) return goTo(go.dataset.goto);

  const opener = e.target.closest('[data-open]');
  if (opener) return openModal(opener.dataset.open);

  if (e.target.matches('[data-close]') || e.target.classList.contains('modal-backdrop')) return closeModals();

  // Botão "Atendida ✓" — pede confirmação
  const closeBtn = e.target.closest('[data-close-request]');
  if (closeBtn) {
    if (!confirm('Confirmar que esta procura foi atendida?')) return;
    try {
      await api(`/api/requests?action=close&id=${closeBtn.dataset.closeRequest}`, { method: 'POST' });
      toast('Procura marcada como atendida ✓');
      await refreshPartial();
    } catch (err) { toast(err.message, true); }
    return;
  }

  // Botão "+1" — pede confirmação simples
  const incBtn = e.target.closest('[data-increment-request]');
  if (incBtn) {
    if (!confirm('Tem certeza que um novo cliente fez o pedido deste item?')) return;
    try {
      const res = await api(`/api/requests?action=increment&id=${incBtn.dataset.incrementRequest}`, { method: 'POST' });
      toast(`+1 registrado! Total: ${res.quantity}x`);
      await refreshPartial();
    } catch (err) { toast(err.message, true); }
  }
});

// Busca com debounce (evita re-render a cada tecla em PC ruim)
$('#product-search').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderProducts, 200);
});

$('#request-search').addEventListener('input', () => {
  clearTimeout(requestSearchDebounce);
  requestSearchDebounce = setTimeout(renderRequests, 200);
});

// Forms
$('#product-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/api/products', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    e.target.reset(); closeModals(); toast('Produto cadastrado com sucesso.');
    await refreshAll();
  } catch (err) { toast(err.message, true); }
});

$('#movement-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/api/movements', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    e.target.reset(); closeModals(); toast('Movimentação registrada.');
    await refreshAll();
  } catch (err) { toast(err.message, true); }
});

$('#request-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/api/requests', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    e.target.reset(); closeModals(); toast('Procura anotada. Excelente!');
    await refreshPartial();
  } catch (err) { toast(err.message, true); }
});

// ─── INIT ────────────────────────────────────────────────────────────────────
$('#today').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
refreshAll();
