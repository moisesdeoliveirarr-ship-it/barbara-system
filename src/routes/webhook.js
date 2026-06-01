const express = require('express');
const router = express.Router();
const { processarMensagem } = require('../services/messageHandler');
const { registrarContato } = require('../services/whatsapp');

router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;

    // Capturar mapeamento de contatos (@lid -> numero real)
    if (body.event === 'contacts.upsert') {
      const contatos = Array.isArray(body.data) ? body.data : [body.data];
      for (const contato of contatos) {
        if (contato?.id && contato?.lid) {
          registrarContato(contato.lid, contato.id);
        } else if (contato?.remoteJid && contato?.lid) {
          registrarContato(contato.lid, contato.remoteJid);
        }
      }
      return;
    }

    console.log('[webhook] recebido:', JSON.stringify(body, null, 2));

    if (body.event !== 'messages.upsert') return;

    const data = body.data;
    if (!data) return;

    if (data.key?.fromMe) return;
    if (data.key?.remoteJid?.includes('@g.us')) return;

    const remoteJid = data.key?.remoteJid || '';
    if (!remoteJid) return;

    const telefone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
    if (!telefone) return;

    console.log(`[webhook] processando mensagem de ${telefone} (jid: ${remoteJid})`);

    const contato = {
      profile: {
        name: data.pushName || telefone
      }
    };

    let msgFormatada = {
      from: telefone,
      fromJid: remoteJid,
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
      console.log('[webhook] tipo nao suportado:', data.messageType);
      return;
    }

    if (msgFormatada.type === 'text' && !msgFormatada.text.body.trim()) return;

    await processarMensagem(msgFormatada, contato, 'whatsapp');
  } catch (err) {
    console.error('Erro no webhook:', err.message);
  }
});

router.get('/', (req, res) => res.send('Webhook Barbara System ativo'));

module.exports = router;
