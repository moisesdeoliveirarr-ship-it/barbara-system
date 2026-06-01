const express = require('express');
const router = express.Router();
const { processarMensagem } = require('../services/messageHandler');

router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    console.log('[webhook] recebido:', JSON.stringify(body, null, 2));

    // Ignorar mensagens enviadas pelo próprio sistema (todas as variantes do Z-API)
    if (body.fromMe === true || body.fromMe === 'true') return;
    if (body.isFromMe === true || body.isFromMe === 'true') return;
    if (body.isSentByMe === true || body.isSentByMe === 'true') return;
    if (body.type === 'SendedCallback') return;
    if (body.type === 'DeliveryCallback') return;
    if (body.type === 'ReadCallback') return;

    // Ignorar se o remetente é o próprio número do bot
    const botPhone = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    if (botPhone && body.phone && String(body.phone) === String(botPhone)) return;

    // Ignorar mensagens de grupo
    if (body.isGroup) return;

    // Só processar ReceivedCallback com texto ou áudio
    const texto = body.text?.message || body.audio?.audioUrl || null;
    if (!texto) return;

    const telefone = body.phone;
    if (!telefone) return;

    const nome = body.senderName || telefone;

    console.log(`[webhook] processando mensagem de ${telefone} — ${nome}`);

    let msgFormatada = {
      from: telefone,
      fromJid: telefone,
      type: 'text',
      text: { body: '' }
    };

    if (body.type === 'ReceivedCallback' && body.text?.message) {
      msgFormatada.text.body = body.text.message;
    } else if (body.audio?.audioUrl) {
      msgFormatada.type = 'audio';
      msgFormatada.audio = { id: body.audio.audioUrl };
    } else if (body.text?.message) {
      msgFormatada.text.body = body.text.message;
    } else {
      console.log('[webhook] tipo nao suportado:', body.type);
      return;
    }

    if (msgFormatada.type === 'text' && !msgFormatada.text.body.trim()) return;

    const contato = { profile: { name: nome } };

    await processarMensagem(msgFormatada, contato, 'whatsapp');
  } catch (err) {
    console.error('Erro no webhook:', err.message);
  }
});

router.get('/', (req, res) => res.send('Webhook Barbara System ativo'));

module.exports = router;
