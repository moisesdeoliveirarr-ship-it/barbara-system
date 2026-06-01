const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'barbara-clinica';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

// Mapeamento @lid -> JID real (ex: 5595...@s.whatsapp.net)
const lidMap = {};

function registrarContato(lid, jidReal) {
  if (lid && jidReal) {
    const lidKey = lid.replace('@lid', '').replace('@s.whatsapp.net', '');
    lidMap[lidKey] = jidReal;
    console.log(`[contatos] mapeado ${lidKey} -> ${jidReal}`);
  }
}

async function enviarTexto(jid, texto, canal = 'whatsapp') {
  try {
    let number = jid;

    if (jid.includes('@lid')) {
      const lidKey = jid.replace('@lid', '');
      if (lidMap[lidKey]) {
        number = lidMap[lidKey];
        console.log(`[whatsapp] @lid resolvido: ${jid} -> ${number}`);
      } else {
        console.log(`[whatsapp] @lid sem mapeamento ainda: ${jid}`);
        // Tenta mesmo assim — pode funcionar em versoes mais novas
        number = jid;
      }
    }

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

module.exports = { enviarTexto, registrarContato };
