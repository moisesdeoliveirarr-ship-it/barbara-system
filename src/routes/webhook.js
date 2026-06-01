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

    // data é o objeto principal com key, pushName, message
    if (data.key?.fromMe) return;
    if (data.key?.remoteJid?.includes('@g.us')) return;

    // Extrair telefone — suporta @s.whatsapp.net e @lid
    const remoteJid = data.key?.remoteJid || '';
    const telefone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
    if (!telefone) return;

    console.log(`[webhook] processando mensagem de ${telefone}`);

    const contato = {
      profile: {
        name: data.pushName || telefone
      }
    };

    // Montar mensagem no formato esperado pelo messageHandler
    let msgFormatada = {
      from: telefone,
      type: 'text',
      text: { body: '' }
    };

    if (data.message?.conversation) {
      msgFormatada.text.body = data.message.conversation;
    } else if (data.message?.extendedTextMessage?.text) {
      msgFormatada.text.body = data.message.extendedTextMessage.text;
    } else if (data.message?.audioMessage) {
      msgFormatada.type = 'audio';
      msgFormatada.audio = { id: data.message.audioMessage.url || '' };
    } else if (data.message?.imageMessage?.caption) {
      msgFormatada.text.body = data.message.imageMessage.caption;
    } else {
      console.log('[webhook] tipo de mensagem nao suportado:', data.messageType);
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
