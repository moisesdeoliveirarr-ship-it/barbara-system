const express = require('express');
const router = express.Router();
const { buscarHistorico, salvarMensagem, buscarCanal } = require('../db/historico');
const { getAviso, setAviso, limparAviso } = require('../db/aviso');
const { enviarTexto } = require('../services/whatsapp');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const SENHA = process.env.DASHBOARD_SENHA || 'barbara2026';

const db = new sqlite3.Database(path.join(__dirname, '../../historico.db'));

function autenticar(req, res, next) {
  const senha = req.query.senha || req.headers['x-senha'];
  if (senha !== SENHA) {
    return res.status(401).send('Acesso negado. Informe ?senha=' + SENHA);
  }
  next();
}

router.get('/', autenticar, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Barbara System – Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #111b21; color: #e9edef; height: 100vh; display: flex; flex-direction: column; }
  #header { background: #202c33; padding: 14px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #2a3942; flex-shrink: 0; }
  #header h1 { font-size: 17px; font-weight: 600; color: #00a884; }
  #header span { font-size: 13px; color: #8696a0; margin-left: auto; }
  #app { display: flex; flex: 1; overflow: hidden; }
  #sidebar { width: 340px; min-width: 280px; background: #111b21; border-right: 1px solid #2a3942; display: flex; flex-direction: column; }
  #sidebar-header { padding: 14px 16px; background: #202c33; font-size: 13px; color: #8696a0; border-bottom: 1px solid #2a3942; }
  #sidebar-header strong { color: #e9edef; display: block; font-size: 15px; margin-bottom: 2px; }
  #contacts { flex: 1; overflow-y: auto; }
  .contact-item { display: flex; align-items: center; gap: 12px; padding: 13px 16px; cursor: pointer; border-bottom: 1px solid #1f2c33; transition: background 0.15s; }
  .contact-item:hover { background: #202c33; }
  .contact-item.active { background: #2a3942; }
  .avatar { width: 46px; height: 46px; border-radius: 50%; background: #00a884; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .contact-info { flex: 1; min-width: 0; }
  .contact-name { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .contact-preview { font-size: 12px; color: #8696a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .contact-time { font-size: 11px; color: #8696a0; flex-shrink: 0; }
  #chat-panel { flex: 1; display: flex; flex-direction: column; background: #0b141a; }
  #chat-header { background: #202c33; padding: 12px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #2a3942; flex-shrink: 0; }
  #chat-header .avatar { width: 38px; height: 38px; font-size: 15px; }
  #chat-header-info { flex: 1; }
  #chat-header-name { font-size: 15px; font-weight: 600; }
  #chat-header-phone { font-size: 12px; color: #8696a0; }
  #messages { flex: 1; overflow-y: auto; padding: 12px 8%; display: flex; flex-direction: column; gap: 4px; }
  .bubble { max-width: 65%; padding: 8px 12px; border-radius: 8px; font-size: 14px; line-height: 1.5; word-wrap: break-word; position: relative; }
  .bubble.user { background: #202c33; align-self: flex-start; border-top-left-radius: 2px; }
  .bubble.assistant { background: #005c4b; align-self: flex-end; border-top-right-radius: 2px; }
  .bubble .meta { font-size: 11px; color: rgba(255,255,255,0.45); text-align: right; margin-top: 4px; }
  .date-divider { text-align: center; margin: 10px 0; }
  .date-divider span { background: #182229; color: #8696a0; font-size: 12px; padding: 4px 12px; border-radius: 8px; }
  #no-chat { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #8696a0; }
  #input-bar { background: #202c33; padding: 10px 16px; display: flex; gap: 10px; align-items: center; border-top: 1px solid #2a3942; flex-shrink: 0; }
  #msg-input { flex: 1; background: #2a3942; border: none; border-radius: 10px; padding: 10px 16px; color: #e9edef; font-size: 14px; outline: none; resize: none; max-height: 120px; font-family: inherit; }
  #msg-input::placeholder { color: #8696a0; }
  #send-btn { background: #00a884; border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  #send-btn:hover { background: #06cf9c; }
  #send-btn svg { fill: white; }
  #send-status { font-size: 12px; color: #8696a0; text-align: center; padding: 4px 16px; flex-shrink: 0; display: none; }
  #loading { color: #8696a0; font-size: 13px; padding: 20px; text-align: center; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #374045; border-radius: 3px; }
</style>
</head>
<body>
<div id="header">
  <h1>Barbara System – Dashboard</h1>
  <span id="status-bar">Atualizando...</span>
</div>
<div id="app">
  <div id="sidebar">
    <div id="sidebar-header"><strong>Conversas</strong><span id="total-contacts"></span></div>
    <div id="contacts"><div id="loading">Carregando...</div></div>
  </div>
  <div id="chat-panel">
    <div id="no-chat">
      <svg width="80" height="80" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <p>Selecione uma conversa para ver o historico</p>
    </div>
  </div>
</div>
<script>
const SENHA = new URLSearchParams(location.search).get('senha') || '';
const API = (path) => path + (path.includes('?') ? '&' : '?') + 'senha=' + encodeURIComponent(SENHA);
let selectedPhone = null;
let selectedName = null;
let allContacts = [];
let lastMsgCount = 0;

async function loadContacts() {
  try {
    const res = await fetch(API('/dashboard/api/conversas'));
    if (!res.ok) return;
    const data = await res.json();
    allContacts = data;
    renderContacts(data);
    document.getElementById('total-contacts').textContent = data.length + ' contato(s)';
    document.getElementById('status-bar').textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR');
  } catch(e) {
    document.getElementById('status-bar').textContent = 'Erro de conexao';
  }
}

function renderContacts(contacts) {
  const el = document.getElementById('contacts');
  if (!contacts.length) { el.innerHTML = '<div style="padding:20px;color:#8696a0;text-align:center">Nenhuma conversa ainda.</div>'; return; }
  el.innerHTML = contacts.map(c => {
    const initials = (c.nome || c.telefone).slice(0,2).toUpperCase();
    const active = c.telefone === selectedPhone ? ' active' : '';
    return \`<div class="contact-item\${active}" onclick="selectContact('\${escHtml(c.telefone)}', '\${escHtml(c.nome || '')}')">
      <div class="avatar">\${initials}</div>
      <div class="contact-info">
        <div class="contact-name">\${escHtml(c.nome || c.telefone)}</div>
        <div class="contact-preview">\${escHtml(c.ultima_mensagem || '')}</div>
      </div>
      <div class="contact-time">\${c.criado_em ? formatTime(c.criado_em) : ''}</div>
    </div>\`;
  }).join('');
}

function selectContact(phone, nome) {
  selectedPhone = phone;
  selectedName = nome;
  lastMsgCount = 0;
  renderChatPanel(phone, nome || phone);
  loadMessages(true);
}

function renderChatPanel(phone, name) {
  const initials = name.slice(0,2).toUpperCase();
  const panel = document.getElementById('chat-panel');
  panel.innerHTML = \`
    <div id="chat-header">
      <div class="avatar">\${escHtml(initials)}</div>
      <div id="chat-header-info">
        <div id="chat-header-name">\${escHtml(name)}</div>
        <div id="chat-header-phone">\${escHtml(phone)}</div>
      </div>
    </div>
    <div id="messages"><div id="loading">Carregando mensagens...</div></div>
    <div id="send-status"></div>
    <div id="input-bar">
      <textarea id="msg-input" placeholder="Mensagem manual (enviado como Dra. Barbara)..." rows="1" onkeydown="handleKey(event)"></textarea>
      <button id="send-btn" onclick="sendMessage()">
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  \`;
  renderContacts(allContacts);
}

async function loadMessages(scrollBottom = false) {
  if (!selectedPhone) return;
  try {
    const res = await fetch(API('/dashboard/api/mensagens/' + encodeURIComponent(selectedPhone)));
    if (!res.ok) return;
    const msgs = await res.json();
    if (msgs.length === lastMsgCount && !scrollBottom) return;
    lastMsgCount = msgs.length;
    renderMessages(msgs, scrollBottom);
  } catch(e) {}
}

function renderMessages(msgs, scrollBottom) {
  const el = document.getElementById('messages');
  if (!el) return;
  if (!msgs.length) { el.innerHTML = '<div style="text-align:center;color:#8696a0;padding:20px;font-size:13px;">Nenhuma mensagem ainda.</div>'; return; }
  let html = '';
  let lastDate = '';
  msgs.forEach(m => {
    const d = new Date(m.criado_em * 1000);
    const dateStr = d.toLocaleDateString('pt-BR');
    if (dateStr !== lastDate) {
      html += \`<div class="date-divider"><span>\${dateStr}</span></div>\`;
      lastDate = dateStr;
    }
    const time = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const roleLabel = m.role === 'user' ? '' : (m.role === 'manual' ? 'Dra. Barbara' : 'Bot Sara');
    html += \`<div class="bubble \${m.role === 'user' ? 'user' : 'assistant'}">
      \${escHtml(m.conteudo)}
      <div class="meta">\${roleLabel ? roleLabel + ' · ' : ''}\${time}</div>
    </div>\`;
  });
  el.innerHTML = html;
  if (scrollBottom) el.scrollTop = el.scrollHeight;
  else if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const statusEl = document.getElementById('send-status');
  if (!input || !selectedPhone) return;
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  document.getElementById('send-btn').disabled = true;
  statusEl.style.display = 'block';
  statusEl.textContent = 'Enviando...';
  try {
    const res = await fetch(API('/dashboard/api/enviar'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ telefone: selectedPhone, mensagem: text })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      input.value = '';
      statusEl.textContent = 'Enviado!';
      setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
      loadMessages(true);
    } else {
      statusEl.textContent = 'Erro: ' + (data.erro || 'Falha ao enviar');
    }
  } catch(e) {
    statusEl.textContent = 'Erro de conexao';
  } finally {
    input.disabled = false;
    document.getElementById('send-btn').disabled = false;
    input.focus();
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
}

loadContacts();
setInterval(() => { loadContacts(); if (selectedPhone) loadMessages(false); }, 3000);
</script>
</body>
</html>`;
  res.send(html);
});

router.get('/api/conversas', autenticar, (req, res) => {
  db.all(
    `SELECT telefone, conteudo AS ultima_mensagem, role, criado_em
     FROM mensagens
     WHERE id IN (SELECT MAX(id) FROM mensagens GROUP BY telefone)
     ORDER BY criado_em DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      // Enriquecer com nome do contato
      db.all(`SELECT telefone, nome FROM contatos`, [], (err2, contatos) => {
        const mapaContatos = {};
        (contatos || []).forEach(c => { mapaContatos[c.telefone] = c.nome; });
        res.json(rows.map(r => ({ ...r, nome: mapaContatos[r.telefone] || null })));
      });
    }
  );
});

router.get('/api/mensagens/:telefone', autenticar, (req, res) => {
  const { telefone } = req.params;
  db.all(
    `SELECT role, conteudo, criado_em FROM mensagens WHERE telefone = ? ORDER BY criado_em ASC`,
    [telefone],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows);
    }
  );
});

router.post('/api/enviar', autenticar, async (req, res) => {
  const { telefone, mensagem } = req.body;
  if (!telefone || !mensagem) return res.status(400).json({ erro: 'telefone e mensagem sao obrigatorios' });
  try {
    const canal = await buscarCanal(telefone);
    await enviarTexto(telefone, mensagem, canal);
    salvarMensagem(telefone, 'manual', mensagem);
    res.json({ ok: true });
  } catch (e) {
    console.error('[dashboard] Erro ao enviar:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.get('/aviso', autenticar, async (req, res) => {
  const aviso = await getAviso();
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aviso para Sara</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #111b21; color: #e9edef; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
  .box { background: #202c33; padding: 28px; border-radius: 12px; width: 100%; max-width: 480px; }
  h2 { color: #00a884; margin-bottom: 6px; }
  p { color: #8696a0; font-size: 13px; margin-bottom: 20px; }
  textarea { width: 100%; background: #2a3942; border: none; border-radius: 8px; padding: 12px; color: #e9edef; font-size: 14px; resize: vertical; min-height: 80px; font-family: inherit; outline: none; box-sizing: border-box; }
  .btns { display: flex; gap: 10px; margin-top: 16px; }
  button { flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; }
  .salvar { background: #00a884; color: #fff; }
  .limpar { background: #2a3942; color: #e9edef; }
  .status { margin-top: 12px; font-size: 13px; color: #00a884; text-align: center; min-height: 18px; }
  .ativo { background: #1a3a2a; border: 1px solid #00a884; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #00a884; }
</style>
</head>
<body>
<div class="box">
  <h2>Aviso para Sara</h2>
  <p>Digite um aviso — a Sara vai informar os pacientes sobre sua indisponibilidade.</p>
  ${aviso ? `<div class="ativo">Aviso ativo: <strong>${aviso}</strong></div>` : ''}
  <textarea id="txt" placeholder="Ex: Estou em viagem, retorno na segunda-feira.">${aviso || ''}</textarea>
  <div class="btns">
    <button class="salvar" onclick="salvar()">Salvar aviso</button>
    <button class="limpar" onclick="limpar()">Limpar aviso</button>
  </div>
  <div class="status" id="status"></div>
</div>
<script>
const senha = new URLSearchParams(location.search).get('senha') || '';
async function salvar() {
  const txt = document.getElementById('txt').value.trim();
  if (!txt) return;
  await fetch('/dashboard/aviso?senha=' + senha, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ texto: txt }) });
  document.getElementById('status').textContent = 'Aviso salvo!';
  setTimeout(() => location.reload(), 1500);
}
async function limpar() {
  await fetch('/dashboard/aviso?senha=' + senha, { method: 'DELETE' });
  document.getElementById('status').textContent = 'Aviso removido!';
  setTimeout(() => location.reload(), 1000);
}
</script>
</body></html>`);
});

router.post('/aviso', autenticar, async (req, res) => {
  const { texto } = req.body;
  if (texto) await setAviso(texto, null);
  res.json({ ok: true });
});

router.delete('/aviso', autenticar, async (req, res) => {
  await limparAviso();
  res.json({ ok: true });
});

router.get('/api/limpar/:telefone', autenticar, (req, res) => {
  const { telefone } = req.params;
  db.run(`DELETE FROM mensagens WHERE telefone = ?`, [telefone], function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ ok: true, deletadas: this.changes });
  });
});

module.exports = router;
