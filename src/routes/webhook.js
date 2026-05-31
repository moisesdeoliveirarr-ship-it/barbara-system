const express = require('express');
const router = express.Router();
const { processarMensagem } = require('../services/messageHandler');

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    console.log('[webhook] recebido:', JSON.stringify(body, null, 2));
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        for (const msg of value.messages || []) {
          await processarMensagem(msg, value.contacts?.[0], 'whatsapp');
        }
      }
    }
  } catch (err) {
    console.error('Erro no webhook:', err.message);
  }
});

module.exports = router;
