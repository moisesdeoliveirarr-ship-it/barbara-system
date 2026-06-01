const axios = require('axios');
const FormData = require('form-data');
const { baixarMidiaWhatsapp } = require('./whatsapp');

async function transcreverAudio(mediaId) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('[transcricao] GROQ_API_KEY nao configurada');
      return null;
    }

    // Baixar audio via Meta API
    const { buffer, mimeType } = await baixarMidiaWhatsapp(mediaId);
    const extensao = mimeType?.includes('ogg') ? 'ogg' : mimeType?.includes('mp4') ? 'mp4' : 'ogg';

    return await transcreverGroq(buffer, extensao);
  } catch (err) {
    console.error('[transcricao] Erro:', err.message);
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
