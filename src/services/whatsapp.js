const axios = require('axios');

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`;

async function enviarTexto(telefone, texto, canal = 'whatsapp') {
  try {
    // Z-API aceita numero no formato 5595XXXXXXXX (sem + e sem @)
    const numero = telefone.replace('@s.whatsapp.net', '').replace('@lid', '').replace('+', '');

    console.log(`[whatsapp] enviando para ${numero}`);

    await axios.post(
      `${ZAPI_URL}/send-text`,
      {
        phone: numero,
        message: texto
      }
    );
  } catch (err) {
    console.error('[whatsapp] Erro ao enviar:', JSON.stringify(err.response?.data) || err.message);
  }
}

module.exports = { enviarTexto };
