const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'barbara-clinica';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

async function enviarTexto(jid, texto, canal = 'whatsapp') {
  try {
    // Usar JID completo se tiver @ — senão adicionar @s.whatsapp.net
    const number = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;

    console.log(`[whatsapp] enviando para ${number}`);

    await axios.post(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        number,
        options: { delay: 1000 },
        textMessage: { text: texto }
      },
      { headers: { apikey: EVOLUTION_KEY } }
    );
  } catch (err) {
    console.error('[whatsapp] Erro ao enviar:', err.response?.data || err.message);
  }
}

module.exports = { enviarTexto };
