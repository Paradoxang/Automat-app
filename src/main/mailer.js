'use strict';
const nodemailer = require('nodemailer');

// Gmail / Google Workspace SMTP (SSL).
function createTransport(user, pass) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass }
  });
}

async function verify(user, pass) {
  const t = createTransport(user, pass);
  await t.verify();
  return true;
}

async function send(user, pass, { from, to, subject, html, text }) {
  const t = createTransport(user, pass);
  const info = await t.sendMail({ from, to, subject, text, html });
  return info.messageId;
}

module.exports = { createTransport, verify, send };
