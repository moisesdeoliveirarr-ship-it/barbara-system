const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'barbara-clinica';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

// Cache de @lid -> numero real
const lidCache = {};

async function resolverNumero(jid) {
  // Se não é @lid, retorna limpo
  if (!jid.includes('@lid')) {
    return jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
  }

  const lid = jid.replace('@lid', '');

  // Verificar cache
  if (lidCache[lid]) {
    console.log(`[whatsapp] cache hit para ${lid}: ${lidCache[lid]}`);
    return lidCache[lid];
  }

  // Tentar buscar o contato via Evolution API
  try {
    const { data } = await axios.post(
      `${EVOLUTION_URL}/contact/fetchContacts/${EVOLUTION_INSTANCE}`,
      { where: { id: { contains: lid } } },
      { headers: { apikey: EVOLUTION_KEY } }
    );
    if (data && data.length > 0) {
      const numero = data[0].remoteJid || data[0].phoneNumber;
      if (numero) {
        lidCache[lid] = numero;
        console.log(`[whatsapp] resolveu ${lid} -> ${numero}`);
        return numero;
      }
    }
  } catch (err) {
    console.log('[whatsapp] nao conseguiu resolver lid via contacts:', err.message);
  }

  // Fallback: tentar enviar direto com @lid (pode funcionar em algumas versoes)
  return jid;
}

async function enviarTexto(jid, texto, canal = 'whatsapp') {
  try {
    const number = await resolverNumero(jid);
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
    console.error('[whatsapp] Erro ao enviar:', JSON.stringify(err.response?.data) || err.message);
  }
}

module.exports = { enviarTexto };
