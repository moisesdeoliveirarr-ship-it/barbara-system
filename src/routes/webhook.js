const express = require('express');
const router = express.Router();
const { processarMensagem } = require('../services/messageHandler');

// Evolution API envia POST com o evento
router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    console.log('[webhook] recebido:', JSON.stringify(body, null, 2));

    // Evolution API v1.7.4 — formato MESSAGES_UPSERT
    if (body.event !== 'messages.upsert') return;

    const data = body.data;
    if (!data) return;

    const msg = data.message || data;
    if (!msg) return;

    // Ignorar mensagens enviadas pelo próprio sistema
    if (msg.key?.fromMe) return;

    // Montar objeto compatível com o messageHandler
    const telefone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '');
    if (!telefone) return;

    // Ignorar grupos
    if (msg.key?.remoteJid?.includes('@g.us')) return;

    const contato = {
      profile: {
        name: msg.pushName || telefone
      }
    };

    // Montar mensagem no formato esperado pelo messageHandler
    let msgFormatada = {
      from: telefone,
      type: 'text',
      text: { body: '' }
    };

    if (msg.message?.conversation) {
      msgFormatada.text.body = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      msgFormatada.text.body = msg.message.extendedTextMessage.text;
    } else if (msg.message?.audioMessage) {
      msgFormatada.type = 'audio';
      msgFormatada.audio = { id: msg.message.audioMessage.url || '' };
    } else if (msg.message?.imageMessage?.caption) {
      msgFormatada.text.body = msg.message.imageMessage.caption;
    } else {
      console.log('[webhook] tipo de mensagem nao suportado');
      return;
    }

    if (msgFormatada.type === 'text' && !msgFormatada.text.body.trim()) return;

    await processarMensagem(msgFormatada, contato, 'whatsapp');
  } catch (err) {
    console.error('Erro no webhook:', err.message);
  }
});

// GET para verificação simples
router.get('/', (req, res) => {
  res.send('Webhook Barbara System ativo');
});

module.exports = router;
