'use strict';
const { app, BrowserWindow, ipcMain, safeStorage, shell, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const mailer = require('./mailer');

let win = null;

// Evita crashes del renderer por GPU en algunos equipos/entornos virtualizados.
app.disableHardwareAcceleration();

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 600,
    title: 'Automatizador',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  store.init(app.getPath('userData'));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- helpers ----------
function encryptPass(plain) {
  if (!plain) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plain).toString('base64');
    }
  } catch (_) {}
  // Fallback (menos seguro) si el cifrado del SO no está disponible.
  return 'b64:' + Buffer.from(plain, 'utf8').toString('base64');
}

function decryptPass(enc) {
  if (!enc) return '';
  if (enc.startsWith('b64:')) {
    return Buffer.from(enc.slice(4), 'base64').toString('utf8');
  }
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'));
    }
  } catch (_) {}
  return '';
}

function render(str, ctx) {
  return String(str == null ? '' : str)
    .split('{{nombre}}').join(ctx.nombre || '')
    .split('{{email}}').join(ctx.email || '')
    .split('{{usuario}}').join(ctx.usuario || '');
}

function toHtml(text) {
  const esc = String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">' +
    esc.replace(/\n/g, '<br>') + '</div>';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickCsvLines(content) {
  return String(content).split(/\r?\n/).filter((l) => l.trim().length);
}

// Normaliza un número a su forma local (sin indicativo, sin signos/espacios).
function localNum(numero, cc) {
  cc = String(cc || '57').replace(/\D/g, '') || '57';
  let d = String(numero == null ? '' : numero).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length > 10 && d.startsWith(cc)) d = d.slice(cc.length);
  return d;
}

// ---------- auth ----------
ipcMain.handle('auth:status', () => ({ hasPassword: store.hasPassword() }));
ipcMain.handle('auth:set', (_e, pw) => { store.setPassword(pw); return true; });
ipcMain.handle('auth:check', (_e, pw) => store.checkPassword(pw));

// ---------- data snapshot (sin secretos) ----------
ipcMain.handle('data:get', () => {
  const d = store.get();
  return {
    email: { from: d.email.from, smtpUser: d.email.smtpUser, hasPass: !!d.email.encPass },
    settings: d.settings,
    emailContacts: d.emailContacts,
    emailTemplates: d.emailTemplates,
    emailLog: d.emailLog.slice(0, 200),
    igLeads: d.igLeads,
    igTemplates: d.igTemplates,
    waLeads: d.waLeads,
    waTemplates: d.waTemplates
  };
});

// ---------- email config ----------
ipcMain.handle('email:getConfig', () => {
  const d = store.get();
  return { from: d.email.from, smtpUser: d.email.smtpUser, hasPass: !!d.email.encPass, settings: d.settings };
});

ipcMain.handle('email:saveConfig', (_e, cfg) => {
  const d = store.get();
  d.email.from = (cfg.from || '').trim();
  d.email.smtpUser = (cfg.smtpUser || '').trim();
  if (cfg.pass) d.email.encPass = encryptPass(String(cfg.pass).replace(/\s+/g, ''));
  if (cfg.settings) {
    d.settings = {
      delaySeconds: Math.max(0, Number(cfg.settings.delaySeconds) || 0),
      dailyCap: Math.max(1, Number(cfg.settings.dailyCap) || 1),
      waCountryCode: String(cfg.settings.waCountryCode || d.settings.waCountryCode || '57').replace(/\D/g, '') || '57'
    };
  }
  store.save();
  return true;
});

ipcMain.handle('email:test', async () => {
  const d = store.get();
  const pass = decryptPass(d.email.encPass);
  if (!d.email.smtpUser || !pass) throw new Error('Falta el usuario o la contraseña de aplicación.');
  await mailer.verify(d.email.smtpUser, pass);
  return true;
});

// ---------- email contacts ----------
ipcMain.handle('contacts:save', (_e, c) => {
  const d = store.get();
  if (c.id) {
    const i = d.emailContacts.findIndex((x) => x.id === c.id);
    if (i >= 0) d.emailContacts[i] = { ...d.emailContacts[i], ...c };
  } else {
    d.emailContacts.push({
      id: store.id(),
      nombre: (c.nombre || '').trim(),
      email: (c.email || '').trim(),
      tags: (c.tags || '').trim(),
      optOut: false
    });
  }
  store.save();
  return true;
});

ipcMain.handle('contacts:remove', (_e, id) => {
  const d = store.get();
  d.emailContacts = d.emailContacts.filter((c) => c.id !== id);
  store.save();
  return true;
});

ipcMain.handle('contacts:optOut', (_e, id, v) => {
  const d = store.get();
  const c = d.emailContacts.find((x) => x.id === id);
  if (c) c.optOut = !!v;
  store.save();
  return true;
});

ipcMain.handle('email:importCsv', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { added: 0 };
  const content = fs.readFileSync(res.filePaths[0], 'utf8');
  const d = store.get();
  let added = 0;
  pickCsvLines(content).forEach((line, idx) => {
    const cells = line.split(/[,;\t]/).map((s) => s.trim().replace(/^"|"$/g, ''));
    if (idx === 0 && !line.includes('@') && /nombre|email|correo|name/i.test(line)) return; // header
    const email = cells.find((c) => c.includes('@'));
    if (!email) return;
    const nombre = cells.find((c) => c && !c.includes('@')) || '';
    if (d.emailContacts.some((c) => c.email.toLowerCase() === email.toLowerCase())) return;
    d.emailContacts.push({ id: store.id(), nombre, email, tags: '', optOut: false });
    added++;
  });
  store.save();
  return { added };
});

// ---------- email templates ----------
ipcMain.handle('templates:save', (_e, t) => {
  const d = store.get();
  if (t.id) {
    const i = d.emailTemplates.findIndex((x) => x.id === t.id);
    if (i >= 0) d.emailTemplates[i] = { ...d.emailTemplates[i], ...t };
  } else {
    d.emailTemplates.push({
      id: store.id(),
      nombre: (t.nombre || 'Sin nombre').trim(),
      asunto: t.asunto || '',
      cuerpo: t.cuerpo || ''
    });
  }
  store.save();
  return true;
});

ipcMain.handle('templates:remove', (_e, id) => {
  const d = store.get();
  d.emailTemplates = d.emailTemplates.filter((t) => t.id !== id);
  store.save();
  return true;
});

// ---------- email send campaign ----------
ipcMain.handle('email:send', async (_e, { templateId, contactIds }) => {
  const d = store.get();
  const pass = decryptPass(d.email.encPass);
  if (!d.email.smtpUser || !pass) throw new Error('Configura primero el correo en Ajustes.');
  const tpl = d.emailTemplates.find((t) => t.id === templateId);
  if (!tpl) throw new Error('Plantilla no encontrada.');

  const targets = d.emailContacts.filter(
    (c) => contactIds.includes(c.id) && !c.optOut && c.email
  );
  const delay = Math.max(0, Number(d.settings.delaySeconds) || 0) * 1000;
  const cap = Math.max(1, Number(d.settings.dailyCap) || 1);
  const list = targets.slice(0, cap);

  let sent = 0, failed = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const subject = render(tpl.asunto, c);
    const body = render(tpl.cuerpo, c);
    let status = 'enviado', error = '';
    try {
      await mailer.send(d.email.smtpUser, pass, {
        from: d.email.from || d.email.smtpUser,
        to: c.email,
        subject,
        html: toHtml(body),
        text: body
      });
      sent++;
    } catch (err) {
      status = 'error';
      error = err.message;
      failed++;
    }
    d.emailLog.unshift({ id: store.id(), to: c.email, nombre: c.nombre, asunto: subject, status, error, ts: Date.now() });
    if (d.emailLog.length > 1000) d.emailLog.length = 1000;
    store.save();
    if (win && !win.isDestroyed()) {
      win.webContents.send('email:progress', { index: i + 1, total: list.length, to: c.email, status, error, sent, failed });
    }
    if (i < list.length - 1 && delay) await sleep(delay);
  }
  return { sent, failed, total: list.length, skipped: targets.length - list.length };
});

// ---------- instagram leads ----------
ipcMain.handle('leads:save', (_e, l) => {
  const d = store.get();
  if (l.id) {
    const i = d.igLeads.findIndex((x) => x.id === l.id);
    if (i >= 0) d.igLeads[i] = { ...d.igLeads[i], ...l };
  } else {
    d.igLeads.push({
      id: store.id(),
      usuario: (l.usuario || '').trim().replace(/^@/, ''),
      nombre: (l.nombre || '').trim(),
      notas: (l.notas || '').trim(),
      estado: 'pendiente'
    });
  }
  store.save();
  return true;
});

ipcMain.handle('leads:remove', (_e, id) => {
  const d = store.get();
  d.igLeads = d.igLeads.filter((l) => l.id !== id);
  store.save();
  return true;
});

ipcMain.handle('leads:setEstado', (_e, id, estado) => {
  const d = store.get();
  const l = d.igLeads.find((x) => x.id === id);
  if (l) l.estado = estado;
  store.save();
  return true;
});

ipcMain.handle('leads:importCsv', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { added: 0 };
  const content = fs.readFileSync(res.filePaths[0], 'utf8');
  const d = store.get();
  let added = 0;
  pickCsvLines(content).forEach((line, idx) => {
    const cells = line.split(/[,;\t]/).map((s) => s.trim().replace(/^"|"$/g, '').replace(/^@/, ''));
    if (idx === 0 && /usuario|user|nombre|name/i.test(line)) return; // header
    const usuario = cells[0];
    if (!usuario) return;
    const nombre = cells[1] || '';
    if (d.igLeads.some((l) => l.usuario.toLowerCase() === usuario.toLowerCase())) return;
    d.igLeads.push({ id: store.id(), usuario, nombre, notas: '', estado: 'pendiente' });
    added++;
  });
  store.save();
  return { added };
});

// ---------- instagram templates ----------
ipcMain.handle('igTemplates:save', (_e, t) => {
  const d = store.get();
  if (t.id) {
    const i = d.igTemplates.findIndex((x) => x.id === t.id);
    if (i >= 0) d.igTemplates[i] = { ...d.igTemplates[i], ...t };
  } else {
    d.igTemplates.push({ id: store.id(), nombre: (t.nombre || 'Sin nombre').trim(), cuerpo: t.cuerpo || '' });
  }
  store.save();
  return true;
});

ipcMain.handle('igTemplates:remove', (_e, id) => {
  const d = store.get();
  d.igTemplates = d.igTemplates.filter((t) => t.id !== id);
  store.save();
  return true;
});

ipcMain.handle('ig:open', (_e, usuario) => {
  const u = String(usuario || '').trim().replace(/^@/, '');
  if (u) shell.openExternal('https://ig.me/m/' + encodeURIComponent(u));
  return true;
});

// ---------- whatsapp leads ----------
ipcMain.handle('waLeads:save', (_e, l) => {
  const d = store.get();
  const cc = d.settings.waCountryCode || '57';
  if (l.id) {
    const i = d.waLeads.findIndex((x) => x.id === l.id);
    if (i >= 0) {
      const base = d.waLeads[i];
      d.waLeads[i] = {
        ...base,
        nombre: (l.nombre != null ? l.nombre : base.nombre || '').trim(),
        notas: (l.notas != null ? l.notas : base.notas || '').trim(),
        numero: localNum(l.numero != null ? l.numero : base.numero, cc)
      };
    }
  } else {
    d.waLeads.push({
      id: store.id(),
      numero: localNum(l.numero, cc),
      nombre: (l.nombre || '').trim(),
      notas: (l.notas || '').trim(),
      estado: 'pendiente'
    });
  }
  store.save();
  return true;
});

ipcMain.handle('waLeads:remove', (_e, id) => {
  const d = store.get();
  d.waLeads = d.waLeads.filter((l) => l.id !== id);
  store.save();
  return true;
});

ipcMain.handle('waLeads:setEstado', (_e, id, estado) => {
  const d = store.get();
  const l = d.waLeads.find((x) => x.id === id);
  if (l) l.estado = estado;
  store.save();
  return true;
});

ipcMain.handle('waLeads:importCsv', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { added: 0 };
  const content = fs.readFileSync(res.filePaths[0], 'utf8');
  const d = store.get();
  const cc = d.settings.waCountryCode || '57';
  let added = 0;
  pickCsvLines(content).forEach((line, idx) => {
    const cells = line.split(/[,;\t]/).map((s) => s.trim().replace(/^"|"$/g, ''));
    if (idx === 0 && !/\d{7,}/.test(line) && /numero|número|telefono|teléfono|phone|nombre|name|whatsapp/i.test(line)) return; // header
    const numCell = cells.find((c) => c.replace(/\D/g, '').length >= 7);
    if (!numCell) return;
    const numero = localNum(numCell, cc);
    const nombre = cells.find((c) => c && c.replace(/\D/g, '').length < 7) || '';
    if (!numero || d.waLeads.some((l) => l.numero === numero)) return;
    d.waLeads.push({ id: store.id(), numero, nombre, notas: '', estado: 'pendiente' });
    added++;
  });
  store.save();
  return { added };
});

// ---------- whatsapp templates ----------
ipcMain.handle('waTemplates:save', (_e, t) => {
  const d = store.get();
  if (t.id) {
    const i = d.waTemplates.findIndex((x) => x.id === t.id);
    if (i >= 0) d.waTemplates[i] = { ...d.waTemplates[i], ...t };
  } else {
    d.waTemplates.push({ id: store.id(), nombre: (t.nombre || 'Sin nombre').trim(), cuerpo: t.cuerpo || '' });
  }
  store.save();
  return true;
});

ipcMain.handle('waTemplates:remove', (_e, id) => {
  const d = store.get();
  d.waTemplates = d.waTemplates.filter((t) => t.id !== id);
  store.save();
  return true;
});

// Abre WhatsApp (web/escritorio) con el número y el mensaje ya escrito.
ipcMain.handle('wa:open', (_e, payload) => {
  const d = store.get();
  const cc = (d.settings.waCountryCode || '57').replace(/\D/g, '') || '57';
  const local = localNum(payload && payload.numero, cc);
  if (!local) return false;
  const text = payload && payload.mensaje ? ('?text=' + encodeURIComponent(payload.mensaje)) : '';
  shell.openExternal('https://wa.me/' + cc + local + text);
  return true;
});

// ---------- clipboard ----------
ipcMain.handle('clipboard:write', (_e, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});
