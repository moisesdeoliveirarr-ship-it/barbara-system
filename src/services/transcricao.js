const axios = require('axios');
const FormData = require('form-data');
const { baixarMidiaWhatsapp } = require('./whatsapp');

async function transcreverAudio(mediaId) {
  try {
    const { buffer, mimeType } = await baixarMidiaWhatsapp(mediaId);
    const extensao = mimeType.includes('ogg') ? 'ogg' : 'mp4';

    if (process.env.GROQ_API_KEY) {
      return await transcreverGroq(buffer, extensao);
    }

    console.warn('GROQ_API_KEY nao configurada — audio ignorado');
    return null;
  } catch (err) {
    console.error('Erro na transcricao:', err.message);
    return null;
  }
}

async function transcreverGroq(buffer, extensao) {
  const form = new FormData();
  form.append('file', buffer, { filename: `audio.${extensao}`, contentType: `audio/${extensao}` });
  form.append('model', 'whisper-large-v3');
  form.append('language', 'pt');

  const { data } = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    }
  });

  return data.text;
}

module.exports = { transcreverAudio };
