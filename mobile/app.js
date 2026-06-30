'use strict';
(function () {
const app = document.getElementById('app');
const KEY = 'automatizador_mobile_v1';

let DB = load();
let route = 'ig';                       // ig | wa | ajustes
const seg = { ig: 'leads', wa: 'leads' }; // leads | plantillas

// ---------- almacenamiento ----------
function fresh() {
  return { igLeads: [], igTemplates: [], waLeads: [], waTemplates: [], settings: { waCountryCode: '57' } };
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return fresh();
    return {
      igLeads: d.igLeads || [], igTemplates: d.igTemplates || [],
      waLeads: d.waLeads || [], waTemplates: d.waTemplates || [],
      settings: { waCountryCode: (d.settings && d.settings.waCountryCode) || '57' }
    };
  } catch (e) { return fresh(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(DB)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---------- utils ----------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderMsg(tpl, lead) {
  return String(tpl == null ? '' : tpl)
    .split('{{nombre}}').join(lead.nombre || '')
    .split('{{usuario}}').join(lead.usuario || '')
    .split('{{numero}}').join(lead.numero || '');
}
function localNum(numero, cc) {
  cc = String(cc || '57').replace(/\D/g, '') || '57';
  let d = String(numero == null ? '' : numero).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length > 10 && d.startsWith(cc)) d = d.slice(cc.length);
  return d;
}
function tplOptions(list) {
  return list.length
    ? list.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')
    : '<option value="">— sin plantillas —</option>';
}

let toastT;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = 'toast'; }, 2400);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

function openLink(url) { window.open(url, '_blank'); }

const cfg = (kind) => kind === 'ig'
  ? { label: 'Instagram', leadsKey: 'igLeads', tplKey: 'igTemplates', items: 'Leads', add: 'Nuevo lead', open: 'Abrir DM', vars: '{{nombre}} {{usuario}}' }
  : { label: 'WhatsApp', leadsKey: 'waLeads', tplKey: 'waTemplates', items: 'Números', add: 'Nuevo número', open: 'Abrir WhatsApp', vars: '{{nombre}} {{numero}}' };

// ---------- modal ----------
function openModal(title, bodyHtml, onSave) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${bodyHtml}
    <div class="modal-actions">
      <button data-modal="cancel">Cancelar</button>
      <button data-modal="save" class="btn-primary">Guardar</button>
    </div></div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', (e) => {
    if (e.target === bg) return closeModal();
    const b = e.target.closest('[data-modal]');
    if (!b) return;
    if (b.dataset.modal === 'cancel') closeModal();
    if (b.dataset.modal === 'save') Promise.resolve(onSave(bg)).then((ok) => { if (ok !== false) closeModal(); });
  });
}
function closeModal() { const m = document.querySelector('.modal-bg'); if (m) m.remove(); }

// ---------- render: shell ----------
function renderApp() {
  app.innerHTML = `
  <header class="app-header">
    <div class="title"><div class="brand-dot">A</div><h1>${route === 'ajustes' ? 'Ajustes' : cfg(route).label}</h1></div>
    ${route === 'ajustes' ? '' : segBar(route)}
  </header>
  <main class="content" id="content"></main>
  <nav class="bottom-nav">
    <button data-nav="ig" class="${route === 'ig' ? 'active' : ''}"><span class="ic">◎</span>Instagram</button>
    <button data-nav="wa" class="${route === 'wa' ? 'active' : ''}"><span class="ic">✆</span>WhatsApp</button>
    <button data-nav="ajustes" class="${route === 'ajustes' ? 'active' : ''}"><span class="ic">⚙</span>Ajustes</button>
  </nav>`;
  renderContent();
}

function segBar(kind) {
  const c = cfg(kind), s = seg[kind];
  return `<div class="seg">
    <button data-seg="leads" data-kind="${kind}" class="${s === 'leads' ? 'active' : ''}">${c.items}</button>
    <button data-seg="plantillas" data-kind="${kind}" class="${s === 'plantillas' ? 'active' : ''}">Plantillas</button>
  </div>`;
}

function renderContent() {
  const el = document.getElementById('content');
  if (route === 'ajustes') { el.innerHTML = ajustesView(); return; }
  el.innerHTML = seg[route] === 'plantillas' ? plantillasView(route) : leadsView(route);
}

// ---------- leads ----------
function leadsView(kind) {
  const c = cfg(kind);
  const leads = DB[c.leadsKey];
  return `
  <div class="searchbar"><input type="search" class="list-search" placeholder="Buscar…"></div>
  <div class="toolbar"><button class="btn-primary" data-act="lead-add" data-kind="${kind}">+ ${esc(c.add)}</button></div>
  <div class="count search-count"></div>
  ${leads.length ? leads.map((l) => leadCard(kind, l)).join('') : `<div class="empty">Sin ${c.items.toLowerCase()} todavía.<br>Toca "+ ${esc(c.add)}" para empezar.</div>`}`;
}

function leadCard(kind, l) {
  const c = cfg(kind);
  const cc = DB.settings.waCountryCode || '57';
  const sub = kind === 'ig' ? '@' + esc(l.usuario) : '+' + esc(cc) + ' ' + esc(l.numero);
  const title = esc(l.nombre || (kind === 'ig' ? l.usuario : l.numero));
  const searchText = esc(((l.nombre || '') + ' ' + (l.usuario || '') + ' ' + (l.numero || '') + ' ' + (l.notas || '')).toLowerCase());
  return `<div class="card" data-id="${l.id}" data-kind="${kind}" data-search="${searchText}">
    <div class="card-head">
      <div class="card-title">${title}<span class="sub">${sub}</span></div>
      <span class="badge ${l.estado}">${l.estado}</span>
    </div>
    <select class="card-tpl">${tplOptions(DB[c.tplKey])}</select>
    <div class="card-actions">
      <button class="btn-sm" data-act="copy">Copiar</button>
      <button class="btn-sm ${kind === 'wa' ? 'btn-wa' : 'btn-primary'}" data-act="open">${esc(c.open)}</button>
      <button class="btn-sm" data-act="estado">${l.estado === 'enviado' ? '↺' : '✓'}</button>
      <button class="btn-sm" data-act="lead-edit">✎</button>
      <button class="btn-sm" data-act="lead-del">🗑</button>
    </div>
  </div>`;
}

function leadModal(kind, l) {
  const c = cfg(kind);
  l = l || {};
  const cc = DB.settings.waCountryCode || '57';
  const body = kind === 'ig'
    ? `<div class="field"><label>Usuario de Instagram (sin @)</label><input id="m-usuario" value="${esc(l.usuario || '')}" placeholder="cliente_ig"></div>
       <div class="field"><label>Nombre (opcional)</label><input id="m-nombre" value="${esc(l.nombre || '')}"></div>
       <div class="field"><label>Notas (opcional)</label><textarea id="m-notas" style="min-height:70px">${esc(l.notas || '')}</textarea></div>`
    : `<div class="field"><label>Número (sin indicativo)</label><input id="m-numero" type="tel" value="${esc(l.numero || '')}" placeholder="300 123 4567"></div>
       <div class="field"><label>Nombre (opcional)</label><input id="m-nombre" value="${esc(l.nombre || '')}"></div>
       <div class="field"><label>Notas (opcional)</label><textarea id="m-notas" style="min-height:70px">${esc(l.notas || '')}</textarea></div>
       <div class="hint">Se enviará a <span class="code">+${esc(cc)}</span> + el número.</div>`;
  openModal(l.id ? 'Editar' : c.add, body, (bg) => {
    const nombre = bg.querySelector('#m-nombre').value.trim();
    const notas = bg.querySelector('#m-notas').value.trim();
    if (kind === 'ig') {
      const usuario = bg.querySelector('#m-usuario').value.trim().replace(/^@/, '');
      if (!usuario) { toast('Falta el usuario'); return false; }
      upsert(c.leadsKey, l.id, { usuario, nombre, notas });
    } else {
      const numero = localNum(bg.querySelector('#m-numero').value, DB.settings.waCountryCode);
      if (numero.length < 7) { toast('Número no válido'); return false; }
      upsert(c.leadsKey, l.id, { numero, nombre, notas });
    }
    renderContent();
    toast('Guardado');
  });
}

// ---------- plantillas ----------
function plantillasView(kind) {
  const c = cfg(kind);
  const ts = DB[c.tplKey];
  return `
  <div class="toolbar"><button class="btn-primary" data-act="tpl-add" data-kind="${kind}">+ Nueva plantilla</button></div>
  <div class="callout">Variables: <span class="code">${c.vars.split(' ').join('</span> <span class="code">')}</span></div>
  ${ts.length ? ts.map((t) => `<div class="card">
    <div class="card-head"><div class="card-title">${esc(t.nombre)}</div></div>
    <div class="muted" style="margin:8px 0;white-space:pre-wrap;font-size:14px">${esc((t.cuerpo || '').slice(0, 160))}${(t.cuerpo || '').length > 160 ? '…' : ''}</div>
    <div class="card-actions">
      <button class="btn-sm" data-act="tpl-edit" data-kind="${kind}" data-id="${t.id}">Editar</button>
      <button class="btn-sm" data-act="tpl-del" data-kind="${kind}" data-id="${t.id}">Eliminar</button>
    </div>
  </div>`).join('') : '<div class="empty">Sin plantillas todavía.</div>'}`;
}

function tplModal(kind, t) {
  const c = cfg(kind);
  t = t || {};
  const body = `<div class="field"><label>Nombre</label><input id="m-nombre" value="${esc(t.nombre || '')}"></div>
    <div class="field"><label>Mensaje</label><textarea id="m-cuerpo" style="min-height:150px" placeholder="Hola {{nombre}} 👋 ...">${esc(t.cuerpo || '')}</textarea></div>
    <div class="hint">Variables: <span class="code">${c.vars.split(' ').join('</span> <span class="code">')}</span></div>`;
  openModal(t.id ? 'Editar plantilla' : 'Nueva plantilla', body, (bg) => {
    const nombre = bg.querySelector('#m-nombre').value.trim();
    if (!nombre) { toast('Ponle un nombre'); return false; }
    upsert(c.tplKey, t.id, { nombre, cuerpo: bg.querySelector('#m-cuerpo').value });
    renderContent();
    toast('Plantilla guardada');
  });
}

// ---------- ajustes ----------
function ajustesView() {
  const s = DB.settings;
  const totals = `${DB.igLeads.length} leads IG · ${DB.waLeads.length} números WA`;
  return `
  <div class="card">
    <div class="card-title">WhatsApp</div>
    <div class="field" style="margin-top:12px"><label>Indicativo de país (por defecto)</label><input id="s-cc" type="tel" value="${esc(s.waCountryCode || '57')}" placeholder="57"></div>
    <div class="hint">Se antepone a todos los números (ej. <span class="code">57</span> = Colombia). Sin el signo +.</div>
    <button class="btn-primary btn-block" data-act="settings-save" style="margin-top:14px">Guardar indicativo</button>
  </div>
  <div class="card">
    <div class="card-title">Datos (${esc(totals)})</div>
    <div class="hint" style="margin:10px 0 14px">Respalda tus leads y plantillas, o trae los de la app de escritorio (su archivo <span class="code">data.json</span> es compatible).</div>
    <div class="card-actions">
      <button data-act="export">Exportar respaldo</button>
      <button data-act="import">Importar</button>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Acerca de</div>
    <div class="hint" style="margin-top:10px">Automatizador móvil — Instagram y WhatsApp asistidos. Tus datos viven solo en este teléfono.</div>
  </div>`;
}

function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'automatizador-datos.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Respaldo descargado');
}
function importData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        DB = {
          igLeads: d.igLeads || [], igTemplates: d.igTemplates || [],
          waLeads: d.waLeads || [], waTemplates: d.waTemplates || [],
          settings: { waCountryCode: (d.settings && d.settings.waCountryCode) || '57' }
        };
        save(); renderApp(); toast('Datos importados');
      } catch (e) { toast('Archivo inválido'); }
    };
    reader.readAsText(f);
  };
  inp.click();
}

// ---------- data ops ----------
function upsert(key, id, fields) {
  if (id) {
    const i = DB[key].findIndex((x) => x.id === id);
    if (i >= 0) DB[key][i] = { ...DB[key][i], ...fields };
  } else {
    const base = key.endsWith('Leads') ? { estado: 'pendiente' } : {};
    DB[key].push({ id: uid(), ...base, ...fields });
  }
  save();
}
function removeItem(key, id) { DB[key] = DB[key].filter((x) => x.id !== id); save(); }

// ---------- acciones por tarjeta ----------
async function doCopy(kind, card) {
  const c = cfg(kind);
  const tpl = DB[c.tplKey].find((t) => t.id === card.querySelector('.card-tpl').value);
  if (!tpl) return toast('Crea o elige una plantilla');
  const lead = DB[c.leadsKey].find((l) => l.id === card.dataset.id);
  const ok = await copyText(renderMsg(tpl.cuerpo, lead));
  toast(ok ? 'Mensaje copiado' : 'No se pudo copiar');
}
function doOpen(kind, card) {
  const c = cfg(kind);
  const lead = DB[c.leadsKey].find((l) => l.id === card.dataset.id);
  if (kind === 'ig') {
    openLink('https://ig.me/m/' + encodeURIComponent(lead.usuario));
  } else {
    const cc = (DB.settings.waCountryCode || '57').replace(/\D/g, '') || '57';
    const tpl = DB[c.tplKey].find((t) => t.id === card.querySelector('.card-tpl').value);
    const text = tpl ? ('?text=' + encodeURIComponent(renderMsg(tpl.cuerpo, lead))) : '';
    openLink('https://wa.me/' + cc + localNum(lead.numero, cc) + text);
  }
}
function toggleEstado(kind, id) {
  const c = cfg(kind);
  const l = DB[c.leadsKey].find((x) => x.id === id);
  if (l) { l.estado = l.estado === 'enviado' ? 'pendiente' : 'enviado'; save(); }
}

// ---------- eventos ----------
function onClick(e) {
  const navB = e.target.closest('[data-nav]');
  if (navB) { route = navB.dataset.nav; renderApp(); return; }
  const segB = e.target.closest('[data-seg]');
  if (segB) { seg[segB.dataset.kind] = segB.dataset.seg; renderApp(); return; }

  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const kind = el.dataset.kind || route;
  const card = el.closest('.card');

  switch (act) {
    case 'lead-add': return leadModal(kind);
    case 'lead-edit': return leadModal(kind, DB[cfg(kind).leadsKey].find((l) => l.id === card.dataset.id));
    case 'lead-del':
      if (confirm('¿Eliminar?')) { removeItem(cfg(kind).leadsKey, card.dataset.id); renderContent(); }
      return;
    case 'copy': return doCopy(kind, card);
    case 'open': return doOpen(kind, card);
    case 'estado': toggleEstado(kind, card.dataset.id); renderContent(); return;

    case 'tpl-add': return tplModal(kind);
    case 'tpl-edit': return tplModal(kind, DB[cfg(kind).tplKey].find((t) => t.id === el.dataset.id));
    case 'tpl-del':
      if (confirm('¿Eliminar plantilla?')) { removeItem(cfg(kind).tplKey, el.dataset.id); renderContent(); }
      return;

    case 'settings-save': {
      const cc = (document.getElementById('s-cc').value || '57').replace(/\D/g, '') || '57';
      DB.settings.waCountryCode = cc; save(); toast('Indicativo guardado');
      return;
    }
    case 'export': return exportData();
    case 'import': return importData();
  }
}

function onInput(e) {
  const el = e.target;
  if (!el.classList || !el.classList.contains('list-search')) return;
  const q = el.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('[data-search]').forEach((row) => {
    const match = !q || row.dataset.search.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) shown++;
  });
  const counter = document.querySelector('.search-count');
  if (counter) counter.textContent = q ? (shown + (shown === 1 ? ' resultado' : ' resultados')) : '';
}

document.addEventListener('click', onClick);
document.addEventListener('input', onInput);

// ---------- service worker (PWA) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

renderApp();
})();
