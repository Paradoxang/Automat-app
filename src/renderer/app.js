'use strict';
(function () {
const api = window.api;
const app = document.getElementById('app');

let DB = null;
let route = 'inicio';
const tabs = { correo: 'contactos', instagram: 'leads', whatsapp: 'leads' };

// ---------- utils ----------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function val(sel) { const el = document.querySelector(sel); return el ? el.value : ''; }
function renderMsg(tpl, lead) {
  return String(tpl == null ? '' : tpl)
    .split('{{nombre}}').join(lead.nombre || '')
    .split('{{email}}').join(lead.email || '')
    .split('{{usuario}}').join(lead.usuario || '')
    .split('{{numero}}').join(lead.numero || '');
}
async function refresh() { DB = await api.data.get(); }

let toastT;
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = 'toast ' + (type || ''); }, 2800);
}

// ---------- modal ----------
function openModal(title, bodyHtml, onSave) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><div class="modal-body">${bodyHtml}</div>
    <div class="row end" style="margin-top:18px">
      <button data-modal="cancel" class="ghost">Cancelar</button>
      <button data-modal="save" class="primary">Guardar</button>
    </div></div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', (e) => {
    if (e.target === bg) return closeModal();
    const b = e.target.closest('[data-modal]');
    if (!b) return;
    if (b.dataset.modal === 'cancel') closeModal();
    if (b.dataset.modal === 'save') Promise.resolve(onSave(bg)).then((ok) => { if (ok !== false) closeModal(); });
  });
  const first = bg.querySelector('input,textarea'); if (first) first.focus();
}
function closeModal() { const m = document.querySelector('.modal-bg'); if (m) m.remove(); }

// Opciones <option> de plantillas para un <select>.
function tplOptions(list) {
  return list.length
    ? list.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')
    : '<option value="">— sin plantillas —</option>';
}

// ---------- auth screens ----------
function renderLogin() {
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <div class="brand-dot">A</div>
    <h1>Automatizador</h1><p class="sub">Ingresa tu contraseña para continuar.</p>
    <div class="field"><input id="login-pw" type="password" placeholder="Contraseña"></div>
    <button class="primary" style="width:100%" data-act="login">Entrar</button>
  </div></div>`;
  const pw = document.querySelector('#login-pw');
  pw.focus();
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}
async function doLogin() {
  const ok = await api.auth.check(val('#login-pw'));
  if (!ok) return toast('Contraseña incorrecta', 'err');
  await refresh();
  renderApp();
}
function renderSetup() {
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <div class="brand-dot">A</div>
    <h1>Bienvenido</h1><p class="sub">Crea una contraseña de acceso para proteger esta app.</p>
    <div class="field"><label>Contraseña</label><input id="pw1" type="password"></div>
    <div class="field"><label>Repite la contraseña</label><input id="pw2" type="password"></div>
    <button class="primary" style="width:100%" data-act="setup">Crear y entrar</button>
  </div></div>`;
}
async function doSetup() {
  const a = val('#pw1'), b = val('#pw2');
  if (a.length < 4) return toast('Mínimo 4 caracteres', 'err');
  if (a !== b) return toast('Las contraseñas no coinciden', 'err');
  await api.auth.set(a);
  await refresh();
  renderApp();
}

// ---------- app shell ----------
function renderApp() {
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="logo"><div class="brand-dot">A</div><b>Automatizador</b></div>
      <div class="nav-item" data-act="nav" data-route="inicio"><span class="ic">▦</span> Inicio</div>
      <div class="nav-item" data-act="nav" data-route="correo"><span class="ic">✉</span> Correo</div>
      <div class="nav-item" data-act="nav" data-route="instagram"><span class="ic">◎</span> Instagram</div>
      <div class="nav-item" data-act="nav" data-route="whatsapp"><span class="ic">✆</span> WhatsApp</div>
      <div class="nav-item" data-act="nav" data-route="ajustes"><span class="ic">⚙</span> Ajustes</div>
      <div class="spacer"></div>
      <div class="nav-item" data-act="logout"><span class="ic">⎋</span> Salir</div>
    </aside>
    <main class="main"></main>
  </div>`;
  route = 'inicio';
  renderRoute();
}

function head(title, sub) {
  return `<div class="page-head"><div><h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div></div></div>`;
}
function tabsBar(view, items) {
  const cur = tabs[view];
  return `<div class="tabs">${items.map(([k, label]) =>
    `<div class="tab ${k === cur ? 'active' : ''}" data-act="tab" data-view="${view}" data-tab="${k}">${label}</div>`).join('')}</div>`;
}

function renderRoute() {
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.route === route));
  const main = document.querySelector('.main');
  if (!main) return;
  if (route === 'inicio') main.innerHTML = head('Inicio', 'Resumen de tu actividad') + viewInicio();
  else if (route === 'correo') main.innerHTML = head('Correo', 'Campañas a posibles clientes') + correoView();
  else if (route === 'instagram') main.innerHTML = head('Instagram', 'DMs semi-manuales, sin riesgo de bloqueo') + instagramView();
  else if (route === 'whatsapp') main.innerHTML = head('WhatsApp', 'Mensajes asistidos vía wa.me, sin riesgo de bloqueo') + whatsappView();
  else if (route === 'ajustes') main.innerHTML = head('Ajustes', 'Conexión de correo, ritmo de envío e indicativo') + viewAjustes();
}

// ---------- Inicio ----------
function viewInicio() {
  const c = DB.emailContacts, igLeads = DB.igLeads, waLeads = DB.waLeads;
  const pend = igLeads.filter((l) => l.estado === 'pendiente').length + waLeads.filter((l) => l.estado === 'pendiente').length;
  return `
  <div class="stat-grid">
    <div class="stat"><div class="n">${c.length}</div><div class="l">Contactos de correo</div></div>
    <div class="stat"><div class="n">${igLeads.length}</div><div class="l">Leads de Instagram</div></div>
    <div class="stat"><div class="n">${waLeads.length}</div><div class="l">Números de WhatsApp</div></div>
    <div class="stat"><div class="n">${pend}</div><div class="l">Mensajes pendientes</div></div>
  </div>
  <div class="card"><h3>Estado del correo</h3>
    ${DB.email.hasPass
      ? `<span class="badge ok">● Configurado</span> <span class="muted">${esc(DB.email.smtpUser)}</span>`
      : `<span class="badge err">● Sin configurar</span> <span class="muted">Ve a Ajustes para conectar tu Gmail.</span>`}
  </div>
  <div class="callout"><b>Instagram y WhatsApp:</b> el envío es semi-manual a propósito. La app arma el mensaje personalizado y abre el chat; tú das enviar. Así evitas bloqueos de la cuenta y respetas los Términos de cada plataforma.</div>
  <div class="callout"><b>Buenas prácticas de correo:</b> escribe solo a contactos con interés real, ofrece una forma de darse de baja y respeta la Ley 1581 (Habeas Data). Marca como "baja" a quien lo pida.</div>`;
}

// ---------- Correo ----------
function correoView() {
  const bar = tabsBar('correo', [['contactos', 'Contactos'], ['plantillas', 'Plantillas'], ['enviar', 'Enviar'], ['historial', 'Historial']]);
  const t = tabs.correo;
  let body = '';
  if (t === 'contactos') body = emailContactosTab();
  else if (t === 'plantillas') body = emailPlantillasTab();
  else if (t === 'enviar') body = emailEnviarTab();
  else body = emailHistorialTab();
  return bar + body;
}

function emailContactosTab() {
  const cs = DB.emailContacts;
  return `
  <div class="row between" style="margin-bottom:14px">
    <div class="row" style="gap:10px;align-items:center">
      <input type="search" class="list-search" placeholder="Buscar contacto…  (Ctrl+F)" style="width:300px">
      <span class="search-count muted" style="font-size:12px"></span>
    </div>
    <div class="row" style="gap:8px"><button data-act="contact-import" title="CSV: nombre,email">Importar CSV</button><button class="primary" data-act="contact-new">Nuevo contacto</button></div>
  </div>
  <div class="card" style="padding:0">
   <table><thead><tr><th>Nombre</th><th>Correo</th><th>Etiquetas</th><th>Estado</th><th></th></tr></thead><tbody>
   ${cs.length ? cs.map((c) => `<tr data-search="${esc(((c.nombre || '') + ' ' + (c.email || '') + ' ' + (c.tags || '')).toLowerCase())}">
     <td>${esc(c.nombre || '—')}</td>
     <td class="mono">${esc(c.email)}</td>
     <td class="muted">${esc(c.tags || '')}</td>
     <td>${c.optOut ? '<span class="badge optout">baja</span>' : '<span class="badge enviado">activo</span>'}</td>
     <td class="actions">
       <button class="sm" data-act="contact-optout" data-id="${c.id}" data-v="${c.optOut ? 0 : 1}">${c.optOut ? 'Reactivar' : 'Dar de baja'}</button>
       <button class="sm" data-act="contact-edit" data-id="${c.id}">Editar</button>
       <button class="sm danger" data-act="contact-del" data-id="${c.id}">×</button>
     </td></tr>`).join('') : '<tr><td colspan="5" class="empty">Sin contactos todavía.</td></tr>'}
   </tbody></table>
  </div>`;
}

function emailPlantillasTab() {
  const ts = DB.emailTemplates;
  return `
  <div class="row end" style="margin-bottom:14px"><button class="primary" data-act="tpl-new">Nueva plantilla</button></div>
  ${ts.length ? ts.map((t) => `<div class="card"><div class="row between">
    <div><b>${esc(t.nombre)}</b><div class="muted" style="margin-top:4px">Asunto: ${esc(t.asunto || '—')}</div></div>
    <div class="row"><button class="sm" data-act="tpl-edit" data-id="${t.id}">Editar</button><button class="sm danger" data-act="tpl-del" data-id="${t.id}">Eliminar</button></div>
  </div></div>`).join('') : '<div class="card empty">Sin plantillas. Crea una usando variables como {{nombre}}.</div>'}`;
}

function emailEnviarTab() {
  const tpls = DB.emailTemplates, cs = DB.emailContacts;
  return `
  <div class="card">
    <div class="row between">
      <div class="row" style="gap:10px;align-items:center">
        <h3 style="margin:0">Destinatarios y plantilla</h3>
        <input type="search" class="list-search" placeholder="Buscar…  (Ctrl+F)" style="width:220px">
        <span class="search-count muted" style="font-size:12px"></span>
      </div>
      <label class="row" style="margin:0;gap:6px;font-size:13px"><input type="checkbox" data-act="select-all" style="width:auto"> Seleccionar todos</label></div>
    <div class="hint" style="margin-top:6px">Elige la plantilla de cada destinatario antes de enviar. Variables: <span class="code">{{nombre}}</span> <span class="code">{{email}}</span>.</div>
    <div style="max-height:360px;overflow:auto;margin-top:12px"><table><tbody>
    ${cs.length ? cs.map((c) => `<tr data-search="${esc(((c.nombre || '') + ' ' + (c.email || '')).toLowerCase())}">
      <td class="checkcell"><input type="checkbox" class="rcp" value="${c.id}" ${c.optOut ? 'disabled' : 'checked'} style="width:auto"></td>
      <td>${esc(c.nombre || '—')}<div class="muted mono" style="font-size:12px">${esc(c.email)}</div></td>
      <td class="right">${c.optOut ? '<span class="badge optout">baja</span>' : `<select class="send-tpl" data-id="${c.id}" style="width:220px">${tplOptions(tpls)}</select>`}</td>
    </tr>`).join('') : '<tr><td class="empty">No hay contactos. Agrégalos en la pestaña Contactos.</td></tr>'}
    </tbody></table></div>
  </div>
  <div class="card"><h3>Enviar</h3>
    <div class="callout">Ritmo actual: <b>${DB.settings.delaySeconds}s</b> entre correos · máximo <b>${DB.settings.dailyCap}</b> por tanda. ${DB.email.hasPass ? '' : '<b style="color:var(--err)">⚠ Configura el correo en Ajustes.</b>'}</div>
    <button class="primary" data-act="send-run" ${tpls.length && DB.email.hasPass ? '' : 'disabled'}>Enviar campaña</button>
    <div class="progress-box" id="send-progress"></div>
  </div>`;
}

function emailHistorialTab() {
  const log = DB.emailLog;
  return `<div class="card" style="padding:0"><table><thead><tr><th>Fecha</th><th>Para</th><th>Asunto</th><th>Estado</th></tr></thead><tbody>
  ${log.length ? log.map((r) => `<tr>
    <td class="muted">${new Date(r.ts).toLocaleString()}</td>
    <td class="mono">${esc(r.to)}</td>
    <td>${esc(r.asunto)}</td>
    <td>${r.status === 'enviado' ? '<span class="badge ok">enviado</span>' : `<span class="badge err" title="${esc(r.error)}">error</span>`}</td>
  </tr>`).join('') : '<tr><td colspan="4" class="empty">Aún no has enviado correos.</td></tr>'}
  </tbody></table></div>`;
}

async function runSend() {
  const checked = [...document.querySelectorAll('.rcp:checked')];
  if (!checked.length) return toast('Selecciona al menos un destinatario', 'err');
  const items = checked.map((cb) => {
    const sel = document.querySelector('.send-tpl[data-id="' + cb.value + '"]');
    return { contactId: cb.value, templateId: sel ? sel.value : '' };
  }).filter((it) => it.templateId);
  if (!items.length) return toast('Elige una plantilla para los destinatarios', 'err');
  const box = document.querySelector('#send-progress'); box.innerHTML = '';
  const btn = document.querySelector('[data-act="send-run"]'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const res = await api.email.send({ items });
    toast(`Listo: ${res.sent} enviados, ${res.failed} fallidos`, res.failed ? 'err' : 'ok');
    await refresh();
  } catch (e) {
    toast(e.message, 'err');
  }
  btn.disabled = false; btn.textContent = 'Enviar campaña';
}

// ---------- Instagram ----------
function instagramView() {
  const bar = tabsBar('instagram', [['leads', 'Leads'], ['plantillas', 'Plantillas'], ['enviar', 'Enviar DMs']]);
  const t = tabs.instagram;
  let body = '';
  if (t === 'leads') body = igLeadsTab();
  else if (t === 'plantillas') body = igPlantillasTab();
  else body = igEnviarTab();
  return bar + body;
}

function igLeadsTab() {
  const ls = DB.igLeads;
  return `
  <div class="row between" style="margin-bottom:14px">
    <div class="row" style="gap:10px;align-items:center">
      <input type="search" class="list-search" placeholder="Buscar lead…  (Ctrl+F)" style="width:300px">
      <span class="search-count muted" style="font-size:12px"></span>
    </div>
    <div class="row" style="gap:8px"><button data-act="lead-import" title="CSV: usuario,nombre">Importar CSV</button><button class="primary" data-act="lead-new">Nuevo lead</button></div>
  </div>
  <div class="card" style="padding:0"><table><thead><tr><th>Usuario</th><th>Nombre</th><th>Notas</th><th>Estado</th><th></th></tr></thead><tbody>
  ${ls.length ? ls.map((l) => `<tr data-search="${esc(((l.usuario || '') + ' ' + (l.nombre || '') + ' ' + (l.notas || '')).toLowerCase())}">
    <td class="mono">@${esc(l.usuario)}</td>
    <td>${esc(l.nombre || '—')}</td>
    <td class="muted">${esc(l.notas || '')}</td>
    <td><span class="badge ${l.estado}">${l.estado}</span></td>
    <td class="actions">
      <button class="sm" data-act="lead-toggle" data-id="${l.id}">${l.estado === 'enviado' ? 'Pendiente' : 'Enviado'}</button>
      <button class="sm" data-act="lead-edit" data-id="${l.id}">Editar</button>
      <button class="sm danger" data-act="lead-del" data-id="${l.id}">×</button>
    </td></tr>`).join('') : '<tr><td colspan="5" class="empty">Sin leads todavía.</td></tr>'}
  </tbody></table></div>`;
}

function igPlantillasTab() {
  const ts = DB.igTemplates;
  return `
  <div class="row end" style="margin-bottom:14px"><button class="primary" data-act="igtpl-new">Nueva plantilla</button></div>
  ${ts.length ? ts.map((t) => `<div class="card"><div class="row between">
    <div style="flex:1"><b>${esc(t.nombre)}</b><div class="muted" style="margin-top:6px;white-space:pre-wrap">${esc((t.cuerpo || '').slice(0, 140))}${(t.cuerpo || '').length > 140 ? '…' : ''}</div></div>
    <div class="row"><button class="sm" data-act="igtpl-edit" data-id="${t.id}">Editar</button><button class="sm danger" data-act="igtpl-del" data-id="${t.id}">Eliminar</button></div>
  </div></div>`).join('') : '<div class="card empty">Sin plantillas. Crea una con variables {{nombre}} y {{usuario}}.</div>'}`;
}

function igEnviarTab() {
  const leads = DB.igLeads;
  const pend = leads.filter((l) => l.estado === 'pendiente').length;
  return `
  <div class="card">
    <div class="row between">
      <div class="row" style="gap:10px;align-items:center">
        <h3 style="margin:0">Leads</h3>
        <input type="search" class="list-search" placeholder="Buscar…  (Ctrl+F)" style="width:240px">
        <span class="search-count muted" style="font-size:12px"></span>
      </div>
      <span class="muted">${pend} pendientes</span>
    </div>
    <div class="callout" style="margin-top:12px">En cada lead: <b>elige la plantilla</b> → <b>Copiar mensaje</b> → <b>Abrir DM</b> → pegas y envías → <b>Marcar enviado</b>. Variables: <span class="code">{{nombre}}</span> <span class="code">{{usuario}}</span>.</div>
    <div style="margin-top:6px">${leads.length ? leads.map(igLeadCard).join('') : '<div class="empty">No hay leads. Agrégalos en la pestaña Leads.</div>'}</div>
  </div>`;
}

function igLeadCard(l) {
  return `<div class="card" data-search="${esc(((l.nombre || '') + ' ' + (l.usuario || '') + ' ' + (l.notas || '')).toLowerCase())}" style="background:var(--panel-2);margin-bottom:10px">
    <div class="row between">
      <div><b>${esc(l.nombre || l.usuario)}</b> <span class="muted mono">@${esc(l.usuario)}</span></div>
      <span class="badge ${l.estado}">${l.estado}</span>
    </div>
    <div class="row" style="margin-top:10px;gap:8px;align-items:center;flex-wrap:wrap">
      <select class="card-tpl" data-id="${l.id}" style="width:220px">${tplOptions(DB.igTemplates)}</select>
      <button class="sm" data-act="ig-copy" data-id="${l.id}">Copiar mensaje</button>
      <button class="sm" data-act="ig-open" data-id="${l.id}">Abrir DM</button>
      <button class="sm primary" data-act="ig-sent" data-id="${l.id}" ${l.estado === 'enviado' ? 'disabled' : ''}>Marcar enviado</button>
    </div>
  </div>`;
}

async function igCopy(id) {
  const sel = document.querySelector('.card-tpl[data-id="' + id + '"]');
  const tpl = DB.igTemplates.find((t) => t.id === (sel ? sel.value : ''));
  if (!tpl) return toast('Crea o elige una plantilla', 'err');
  const lead = DB.igLeads.find((l) => l.id === id);
  await api.clipboard.write(renderMsg(tpl.cuerpo, lead));
  toast('Mensaje copiado al portapapeles', 'ok');
}

// ---------- WhatsApp ----------
function whatsappView() {
  const bar = tabsBar('whatsapp', [['leads', 'Números'], ['plantillas', 'Plantillas'], ['enviar', 'Enviar']]);
  const t = tabs.whatsapp;
  let body = '';
  if (t === 'leads') body = waLeadsTab();
  else if (t === 'plantillas') body = waPlantillasTab();
  else body = waEnviarTab();
  return bar + body;
}

function waLeadsTab() {
  const ls = DB.waLeads, cc = DB.settings.waCountryCode || '57';
  return `
  <div class="row between" style="margin-bottom:14px">
    <div class="row" style="gap:10px;align-items:center">
      <input type="search" class="list-search" placeholder="Buscar número o nombre…  (Ctrl+F)" style="width:300px">
      <span class="search-count muted" style="font-size:12px"></span>
    </div>
    <div class="row" style="gap:8px"><button data-act="wa-import" title="CSV: numero,nombre">Importar CSV</button><button class="primary" data-act="wa-new">Nuevo número</button></div>
  </div>
  <div class="card" style="padding:0"><table><thead><tr><th>Número</th><th>Nombre</th><th>Notas</th><th>Estado</th><th></th></tr></thead><tbody>
  ${ls.length ? ls.map((l) => `<tr data-search="${esc(((l.numero || '') + ' ' + (l.nombre || '') + ' ' + (l.notas || '')).toLowerCase())}">
    <td class="mono">+${esc(cc)} ${esc(l.numero)}</td>
    <td>${esc(l.nombre || '—')}</td>
    <td class="muted">${esc(l.notas || '')}</td>
    <td><span class="badge ${l.estado}">${l.estado}</span></td>
    <td class="actions">
      <button class="sm" data-act="wa-toggle" data-id="${l.id}">${l.estado === 'enviado' ? 'Pendiente' : 'Enviado'}</button>
      <button class="sm" data-act="wa-edit" data-id="${l.id}">Editar</button>
      <button class="sm danger" data-act="wa-del" data-id="${l.id}">×</button>
    </td></tr>`).join('') : '<tr><td colspan="5" class="empty">Sin números todavía.</td></tr>'}
  </tbody></table></div>`;
}

function waPlantillasTab() {
  const ts = DB.waTemplates;
  return `
  <div class="row end" style="margin-bottom:14px"><button class="primary" data-act="watpl-new">Nueva plantilla</button></div>
  ${ts.length ? ts.map((t) => `<div class="card"><div class="row between">
    <div style="flex:1"><b>${esc(t.nombre)}</b><div class="muted" style="margin-top:6px;white-space:pre-wrap">${esc((t.cuerpo || '').slice(0, 140))}${(t.cuerpo || '').length > 140 ? '…' : ''}</div></div>
    <div class="row"><button class="sm" data-act="watpl-edit" data-id="${t.id}">Editar</button><button class="sm danger" data-act="watpl-del" data-id="${t.id}">Eliminar</button></div>
  </div></div>`).join('') : '<div class="card empty">Sin plantillas. Crea una con variables {{nombre}} y {{numero}}.</div>'}`;
}

function waEnviarTab() {
  const leads = DB.waLeads;
  const pend = leads.filter((l) => l.estado === 'pendiente').length;
  return `
  <div class="card">
    <div class="row between">
      <div class="row" style="gap:10px;align-items:center">
        <h3 style="margin:0">Números</h3>
        <input type="search" class="list-search" placeholder="Buscar…  (Ctrl+F)" style="width:240px">
        <span class="search-count muted" style="font-size:12px"></span>
      </div>
      <span class="muted">${pend} pendientes</span>
    </div>
    <div class="callout" style="margin-top:12px">En cada número: <b>elige la plantilla</b> → <b>Abrir WhatsApp</b> (abre el chat con el mensaje ya escrito) → das <b>Enviar</b> → <b>Marcar enviado</b>. Variables: <span class="code">{{nombre}}</span> <span class="code">{{numero}}</span>.</div>
    <div style="margin-top:6px">${leads.length ? leads.map(waLeadCard).join('') : '<div class="empty">No hay números. Agrégalos en la pestaña Números.</div>'}</div>
  </div>`;
}

function waLeadCard(l) {
  const cc = DB.settings.waCountryCode || '57';
  return `<div class="card" data-search="${esc(((l.nombre || '') + ' ' + (l.numero || '') + ' ' + (l.notas || '')).toLowerCase())}" style="background:var(--panel-2);margin-bottom:10px">
    <div class="row between">
      <div><b>${esc(l.nombre || ('+' + cc + ' ' + l.numero))}</b> <span class="muted mono">+${esc(cc)} ${esc(l.numero)}</span></div>
      <span class="badge ${l.estado}">${l.estado}</span>
    </div>
    <div class="row" style="margin-top:10px;gap:8px;align-items:center;flex-wrap:wrap">
      <select class="card-tpl" data-id="${l.id}" style="width:220px">${tplOptions(DB.waTemplates)}</select>
      <button class="sm" data-act="wa-copy" data-id="${l.id}">Copiar mensaje</button>
      <button class="sm primary" data-act="wa-open" data-id="${l.id}">Abrir WhatsApp</button>
      <button class="sm" data-act="wa-sent" data-id="${l.id}" ${l.estado === 'enviado' ? 'disabled' : ''}>Marcar enviado</button>
    </div>
  </div>`;
}

async function waCopy(id) {
  const sel = document.querySelector('.card-tpl[data-id="' + id + '"]');
  const tpl = DB.waTemplates.find((t) => t.id === (sel ? sel.value : ''));
  if (!tpl) return toast('Crea o elige una plantilla', 'err');
  const lead = DB.waLeads.find((l) => l.id === id);
  await api.clipboard.write(renderMsg(tpl.cuerpo, lead));
  toast('Mensaje copiado al portapapeles', 'ok');
}

async function waOpen(id) {
  const sel = document.querySelector('.card-tpl[data-id="' + id + '"]');
  const tpl = DB.waTemplates.find((t) => t.id === (sel ? sel.value : ''));
  if (!tpl) return toast('Crea o elige una plantilla', 'err');
  const lead = DB.waLeads.find((l) => l.id === id);
  await api.wa.open({ numero: lead.numero, mensaje: renderMsg(tpl.cuerpo, lead) });
}

// ---------- Ajustes ----------
function viewAjustes() {
  const e = DB.email, s = DB.settings;
  return `
  <div class="card"><h3>Correo (Gmail / Google Workspace)</h3>
    <div class="callout">Necesitas una <b>Contraseña de aplicación</b> de Google (requiere verificación en 2 pasos activa). No es tu contraseña normal. Se guarda cifrada en este equipo.</div>
    <div class="field"><label>Remitente visible (From)</label><input id="s-from" value="${esc(e.from || '')}" placeholder="Mi Negocio &lt;ventas@empresa.com&gt;"></div>
    <div class="grid-2">
      <div class="field"><label>Usuario SMTP (tu correo)</label><input id="s-user" value="${esc(e.smtpUser || '')}" placeholder="ventas@empresa.com"></div>
      <div class="field"><label>Contraseña de aplicación</label><input id="s-pass" type="password" placeholder="${e.hasPass ? '•••••••• (guardada)' : '16 caracteres'}"></div>
    </div>
    <div class="row" style="gap:8px"><button class="primary" data-act="settings-save">Guardar</button><button data-act="settings-test">Probar conexión</button></div>
  </div>
  <div class="card"><h3>Ritmo de envío</h3>
    <div class="grid-2">
      <div class="field"><label>Segundos entre correos</label><input id="s-delay" type="number" min="0" value="${s.delaySeconds}"></div>
      <div class="field"><label>Máximo por tanda</label><input id="s-cap" type="number" min="1" value="${s.dailyCap}"></div>
    </div>
    <div class="hint">Un ritmo más lento reduce el riesgo de que Gmail marque tus envíos como spam. Gmail gratuito permite ~500/día; Workspace ~2.000/día.</div>
  </div>
  <div class="card"><h3>WhatsApp</h3>
    <div class="field" style="max-width:240px"><label>Indicativo de país (por defecto)</label><input id="s-wacc" value="${esc(s.waCountryCode || '57')}" placeholder="57"></div>
    <div class="hint">Se antepone a todos los números de WhatsApp (ej. <span class="code">57</span> = Colombia). Sin el signo <span class="code">+</span>.</div>
    <div class="row" style="margin-top:12px"><button class="primary" data-act="settings-save">Guardar</button></div>
  </div>`;
}

async function saveSettings() {
  await api.email.saveConfig({
    from: val('#s-from'),
    smtpUser: val('#s-user'),
    pass: val('#s-pass') || undefined,
    settings: { delaySeconds: Number(val('#s-delay')), dailyCap: Number(val('#s-cap')), waCountryCode: val('#s-wacc') }
  });
  await refresh();
}
async function settingsTest() {
  await saveSettings();
  toast('Probando conexión…');
  try { await api.email.test(); toast('Conexión correcta ✓', 'ok'); }
  catch (e) { toast('Error: ' + e.message, 'err'); }
}

// ---------- modals ----------
function contactModal(c) {
  c = c || {};
  openModal(c.id ? 'Editar contacto' : 'Nuevo contacto', `
    <div class="field"><label>Nombre</label><input id="m-nombre" value="${esc(c.nombre || '')}"></div>
    <div class="field"><label>Correo</label><input id="m-email" value="${esc(c.email || '')}" placeholder="cliente@ejemplo.com"></div>
    <div class="field"><label>Etiquetas (opcional)</label><input id="m-tags" value="${esc(c.tags || '')}" placeholder="vip, evento"></div>`,
    async (bg) => {
      const email = bg.querySelector('#m-email').value.trim();
      if (!email.includes('@')) { toast('Correo no válido', 'err'); return false; }
      await api.contacts.save({ id: c.id, nombre: bg.querySelector('#m-nombre').value, email, tags: bg.querySelector('#m-tags').value });
      await refresh(); renderRoute(); toast('Contacto guardado', 'ok');
    });
}
function templateModal(t) {
  t = t || {};
  openModal(t.id ? 'Editar plantilla' : 'Nueva plantilla', `
    <div class="field"><label>Nombre interno</label><input id="m-nombre" value="${esc(t.nombre || '')}"></div>
    <div class="field"><label>Asunto</label><input id="m-asunto" value="${esc(t.asunto || '')}" placeholder="Una propuesta para {{nombre}}"></div>
    <div class="field"><label>Cuerpo</label><textarea id="m-cuerpo" style="min-height:190px" placeholder="Hola {{nombre}}, ...">${esc(t.cuerpo || '')}</textarea></div>
    <div class="hint">Variables: <span class="code">{{nombre}}</span> <span class="code">{{email}}</span></div>`,
    async (bg) => {
      const nombre = bg.querySelector('#m-nombre').value.trim();
      if (!nombre) { toast('Ponle un nombre', 'err'); return false; }
      await api.templates.save({ id: t.id, nombre, asunto: bg.querySelector('#m-asunto').value, cuerpo: bg.querySelector('#m-cuerpo').value });
      await refresh(); renderRoute(); toast('Plantilla guardada', 'ok');
    });
}
function leadModal(l) {
  l = l || {};
  openModal(l.id ? 'Editar lead' : 'Nuevo lead', `
    <div class="field"><label>Usuario de Instagram (sin @)</label><input id="m-usuario" value="${esc(l.usuario || '')}" placeholder="cliente_ig"></div>
    <div class="field"><label>Nombre (opcional)</label><input id="m-nombre" value="${esc(l.nombre || '')}"></div>
    <div class="field"><label>Notas (opcional)</label><textarea id="m-notas" style="min-height:80px">${esc(l.notas || '')}</textarea></div>`,
    async (bg) => {
      const usuario = bg.querySelector('#m-usuario').value.trim().replace(/^@/, '');
      if (!usuario) { toast('Falta el usuario', 'err'); return false; }
      await api.leads.save({ id: l.id, usuario, nombre: bg.querySelector('#m-nombre').value, notas: bg.querySelector('#m-notas').value });
      await refresh(); renderRoute(); toast('Lead guardado', 'ok');
    });
}
function igTemplateModal(t) {
  t = t || {};
  openModal(t.id ? 'Editar plantilla' : 'Nueva plantilla', `
    <div class="field"><label>Nombre interno</label><input id="m-nombre" value="${esc(t.nombre || '')}"></div>
    <div class="field"><label>Mensaje</label><textarea id="m-cuerpo" style="min-height:170px" placeholder="Hola {{nombre}} 👋 ...">${esc(t.cuerpo || '')}</textarea></div>
    <div class="hint">Variables: <span class="code">{{nombre}}</span> <span class="code">{{usuario}}</span></div>`,
    async (bg) => {
      const nombre = bg.querySelector('#m-nombre').value.trim();
      if (!nombre) { toast('Ponle un nombre', 'err'); return false; }
      await api.igTemplates.save({ id: t.id, nombre, cuerpo: bg.querySelector('#m-cuerpo').value });
      await refresh(); renderRoute(); toast('Plantilla guardada', 'ok');
    });
}
function waLeadModal(l) {
  l = l || {};
  const cc = DB.settings.waCountryCode || '57';
  openModal(l.id ? 'Editar número' : 'Nuevo número', `
    <div class="field"><label>Número de WhatsApp (sin indicativo)</label><input id="m-numero" value="${esc(l.numero || '')}" placeholder="300 123 4567"></div>
    <div class="field"><label>Nombre (opcional)</label><input id="m-nombre" value="${esc(l.nombre || '')}"></div>
    <div class="field"><label>Notas (opcional)</label><textarea id="m-notas" style="min-height:80px">${esc(l.notas || '')}</textarea></div>
    <div class="hint">Se enviará a <span class="code">+${esc(cc)}</span> + el número. El indicativo se cambia en Ajustes.</div>`,
    async (bg) => {
      const numero = bg.querySelector('#m-numero').value.replace(/\D/g, '');
      if (numero.length < 7) { toast('Número no válido', 'err'); return false; }
      await api.waLeads.save({ id: l.id, numero, nombre: bg.querySelector('#m-nombre').value, notas: bg.querySelector('#m-notas').value });
      await refresh(); renderRoute(); toast('Número guardado', 'ok');
    });
}
function waTemplateModal(t) {
  t = t || {};
  openModal(t.id ? 'Editar plantilla' : 'Nueva plantilla', `
    <div class="field"><label>Nombre interno</label><input id="m-nombre" value="${esc(t.nombre || '')}"></div>
    <div class="field"><label>Mensaje</label><textarea id="m-cuerpo" style="min-height:170px" placeholder="Hola {{nombre}} 👋 ...">${esc(t.cuerpo || '')}</textarea></div>
    <div class="hint">Variables: <span class="code">{{nombre}}</span> <span class="code">{{numero}}</span></div>`,
    async (bg) => {
      const nombre = bg.querySelector('#m-nombre').value.trim();
      if (!nombre) { toast('Ponle un nombre', 'err'); return false; }
      await api.waTemplates.save({ id: t.id, nombre, cuerpo: bg.querySelector('#m-cuerpo').value });
      await refresh(); renderRoute(); toast('Plantilla guardada', 'ok');
    });
}

// ---------- event delegation ----------
async function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  switch (act) {
    case 'login': return doLogin();
    case 'setup': return doSetup();
    case 'logout': return renderLogin();
    case 'nav': route = el.dataset.route; return renderRoute();
    case 'tab': tabs[el.dataset.view] = el.dataset.tab; return renderRoute();

    case 'contact-new': return contactModal();
    case 'contact-edit': return contactModal(DB.emailContacts.find((c) => c.id === id));
    case 'contact-del': if (confirm('¿Eliminar contacto?')) { await api.contacts.remove(id); await refresh(); renderRoute(); } return;
    case 'contact-optout': await api.contacts.optOut(id, el.dataset.v === '1'); await refresh(); renderRoute(); return;
    case 'contact-import': { const r = await api.email.importCsv(); await refresh(); renderRoute(); toast(`${r.added} contactos importados`, r.added ? 'ok' : 'err'); } return;

    case 'tpl-new': return templateModal();
    case 'tpl-edit': return templateModal(DB.emailTemplates.find((t) => t.id === id));
    case 'tpl-del': if (confirm('¿Eliminar plantilla?')) { await api.templates.remove(id); await refresh(); renderRoute(); } return;

    case 'send-run': return runSend();

    case 'lead-new': return leadModal();
    case 'lead-edit': return leadModal(DB.igLeads.find((l) => l.id === id));
    case 'lead-del': if (confirm('¿Eliminar lead?')) { await api.leads.remove(id); await refresh(); renderRoute(); } return;
    case 'lead-toggle': { const l = DB.igLeads.find((x) => x.id === id); await api.leads.setEstado(id, l.estado === 'enviado' ? 'pendiente' : 'enviado'); await refresh(); renderRoute(); } return;
    case 'lead-import': { const r = await api.leads.importCsv(); await refresh(); renderRoute(); toast(`${r.added} leads importados`, r.added ? 'ok' : 'err'); } return;

    case 'igtpl-new': return igTemplateModal();
    case 'igtpl-edit': return igTemplateModal(DB.igTemplates.find((t) => t.id === id));
    case 'igtpl-del': if (confirm('¿Eliminar plantilla?')) { await api.igTemplates.remove(id); await refresh(); renderRoute(); } return;

    case 'ig-copy': return igCopy(id);
    case 'ig-open': { const l = DB.igLeads.find((x) => x.id === id); await api.ig.open(l.usuario); } return;
    case 'ig-sent': await api.leads.setEstado(id, 'enviado'); await refresh(); renderRoute(); toast('Marcado como enviado', 'ok'); return;

    case 'wa-new': return waLeadModal();
    case 'wa-edit': return waLeadModal(DB.waLeads.find((l) => l.id === id));
    case 'wa-del': if (confirm('¿Eliminar número?')) { await api.waLeads.remove(id); await refresh(); renderRoute(); } return;
    case 'wa-toggle': { const l = DB.waLeads.find((x) => x.id === id); await api.waLeads.setEstado(id, l.estado === 'enviado' ? 'pendiente' : 'enviado'); await refresh(); renderRoute(); } return;
    case 'wa-import': { const r = await api.waLeads.importCsv(); await refresh(); renderRoute(); toast(`${r.added} números importados`, r.added ? 'ok' : 'err'); } return;

    case 'watpl-new': return waTemplateModal();
    case 'watpl-edit': return waTemplateModal(DB.waTemplates.find((t) => t.id === id));
    case 'watpl-del': if (confirm('¿Eliminar plantilla?')) { await api.waTemplates.remove(id); await refresh(); renderRoute(); } return;

    case 'wa-copy': return waCopy(id);
    case 'wa-open': return waOpen(id);
    case 'wa-sent': await api.waLeads.setEstado(id, 'enviado'); await refresh(); renderRoute(); toast('Marcado como enviado', 'ok'); return;

    case 'settings-save': await saveSettings(); renderRoute(); toast('Ajustes guardados', 'ok'); return;
    case 'settings-test': return settingsTest();
  }
}

function onChange(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'select-all') {
    document.querySelectorAll('.rcp:not([disabled])').forEach((c) => {
      const tr = c.closest('tr');
      if (tr && tr.style.display === 'none') return; // respeta el filtro de búsqueda
      c.checked = el.checked;
    });
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
document.addEventListener('change', onChange);
document.addEventListener('input', onInput);

// Ctrl/Cmd+F enfoca el buscador de la lista actual (como en VS Code).
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    const s = document.querySelector('.list-search');
    if (s) { e.preventDefault(); s.focus(); s.select(); }
  }
});

api.onEmailProgress((d) => {
  const box = document.querySelector('#send-progress');
  if (!box) return;
  const line = document.createElement('div');
  line.className = 'progress-line';
  line.innerHTML = `${d.index}/${d.total} · <span class="mono">${esc(d.to)}</span> · ${d.status === 'enviado' ? '<span class="badge ok">ok</span>' : `<span class="badge err">error</span>`}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
});

// ---------- boot ----------
(async function boot() {
  const st = await api.auth.status();
  if (!st.hasPassword) renderSetup();
  else renderLogin();
})();
})();
