const axios = require('axios');
const FormData = require('form-data');

async function transcreverAudio(audioUrl) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('[transcricao] GROQ_API_KEY nao configurada');
      return null;
    }

    // Baixar o audio da URL do Z-API
    const { data: buffer, headers } = await axios.get(audioUrl, {
      responseType: 'arraybuffer'
    });

    const mimeType = headers['content-type'] || 'audio/ogg';
    const extensao = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'ogg';

    return await transcreverGroq(Buffer.from(buffer), extensao);
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
