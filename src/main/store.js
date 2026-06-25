'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let dataPath = null;
let data = null;

const DEFAULTS = {
  auth: null, // { salt, hash }
  email: { from: '', smtpUser: '', encPass: '' },
  emailContacts: [], // { id, nombre, email, tags, optOut }
  emailTemplates: [], // { id, nombre, asunto, cuerpo }
  emailLog: [], // { id, to, nombre, asunto, status, error, ts }
  igLeads: [], // { id, usuario, nombre, notas, estado }
  igTemplates: [], // { id, nombre, cuerpo }
  settings: { delaySeconds: 8, dailyCap: 200 }
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function init(userDataDir) {
  dataPath = path.join(userDataDir, 'data.json');
  load();
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    data = {
      ...clone(DEFAULTS),
      ...raw,
      email: { ...DEFAULTS.email, ...(raw.email || {}) },
      settings: { ...DEFAULTS.settings, ...(raw.settings || {}) }
    };
  } catch (e) {
    data = clone(DEFAULTS);
    save();
  }
}

function save() {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

function get() { return data; }

// ----- auth -----
function hasPassword() { return !!(data.auth && data.auth.hash); }

function setPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  data.auth = { salt, hash };
  save();
}

function checkPassword(pw) {
  if (!hasPassword()) return false;
  const hash = crypto.scryptSync(String(pw), data.auth.salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(data.auth.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = {
  init, load, save, get,
  hasPassword, setPassword, checkPassword,
  id, DEFAULTS
};
