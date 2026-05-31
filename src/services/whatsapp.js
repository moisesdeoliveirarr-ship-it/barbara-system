const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v19.0';

async function enviarTexto(telefone, texto, canal = 'whatsapp') {
  await axios.post(
    `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'text',
      text: { body: texto }
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
}

async function baixarMidiaWhatsapp(mediaId) {
  const { data: info } = await axios.get(`${BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  });

  const { data: buffer } = await axios.get(info.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    responseType: 'arraybuffer'
  });

  return { buffer: Buffer.from(buffer), mimeType: info.mime_type };
}

module.exports = { enviarTexto, baixarMidiaWhatsapp };
