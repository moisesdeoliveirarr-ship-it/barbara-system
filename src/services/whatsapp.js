const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'barbara-clinica';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

async function enviarTexto(telefone, texto, canal = 'whatsapp') {
  try {
    await axios.post(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        number: telefone,
        options: { delay: 1000 },
        textMessage: { text: texto }
      },
      { headers: { apikey: EVOLUTION_KEY } }
    );
  } catch (err) {
    console.error('[whatsapp] Erro ao enviar:', err.message);
  }
}

module.exports = { enviarTexto };
