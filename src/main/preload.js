'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  auth: {
    status: () => invoke('auth:status'),
    set: (pw) => invoke('auth:set', pw),
    check: (pw) => invoke('auth:check', pw)
  },
  data: {
    get: () => invoke('data:get')
  },
  email: {
    getConfig: () => invoke('email:getConfig'),
    saveConfig: (cfg) => invoke('email:saveConfig', cfg),
    test: () => invoke('email:test'),
    send: (payload) => invoke('email:send', payload),
    importCsv: () => invoke('email:importCsv')
  },
  contacts: {
    save: (c) => invoke('contacts:save', c),
    remove: (id) => invoke('contacts:remove', id),
    optOut: (id, v) => invoke('contacts:optOut', id, v)
  },
  templates: {
    save: (t) => invoke('templates:save', t),
    remove: (id) => invoke('templates:remove', id)
  },
  leads: {
    save: (l) => invoke('leads:save', l),
    remove: (id) => invoke('leads:remove', id),
    setEstado: (id, estado) => invoke('leads:setEstado', id, estado),
    importCsv: () => invoke('leads:importCsv')
  },
  igTemplates: {
    save: (t) => invoke('igTemplates:save', t),
    remove: (id) => invoke('igTemplates:remove', id)
  },
  ig: {
    open: (usuario) => invoke('ig:open', usuario)
  },
  clipboard: {
    write: (text) => invoke('clipboard:write', text)
  },
  onEmailProgress: (cb) => ipcRenderer.on('email:progress', (_e, d) => cb(d))
});
