const { buscarHistorico, salvarMensagem, salvarContato, buscarCanal } = require('../db/historico');
const { notificarTelegram } = require('./telegram');
const { chamarClaude } = require('./claude');
const { transcreverAudio } = require('./transcricao');
const { enviarTexto } = require('./whatsapp');
const { executarFerramenta } = require('./ferramentas');

const emProcessamento = new Map();

async function processarMensagem(msg, contato, canal) {
  const telefone = msg.from;
  const jidEnvio = msg.fromJid || msg.from; // JID completo para envio via Evolution API
  const nome = contato?.profile?.name || 'Paciente';

  salvarContato(telefone, canal, nome !== 'Paciente' ? nome : null);

  // Notificar Dra. Barbara no primeiro contato
  const historicoPre = await buscarHistorico(telefone);
  if (historicoPre.length === 0) {
    const previewTexto = msg.type === 'text' ? msg.text.body : '[audio]';
    notificarTelegram(
      `Novo paciente no WhatsApp!\n${nome} (${telefone}):\n"${previewTexto}"`
    ).catch(() => {});
  }

  // Lock por telefone para evitar processamento duplicado
  while (emProcessamento.has(telefone)) {
    await emProcessamento.get(telefone);
  }
  let resolverLock;
  const lockPromise = new Promise(r => { resolverLock = r; });
  emProcessamento.set(telefone, lockPromise);

  try {
    let texto = '';

    if (msg.type === 'text') {
      texto = msg.text.body;
    } else if (msg.type === 'audio') {
      console.log(`[${telefone}] Audio recebido — transcrevendo...`);
      texto = await transcreverAudio(msg.audio.id); // id = audioUrl no Z-API
      if (!texto) {
        await enviarTexto(jidEnvio, 'Desculpe, nao consegui entender o audio. Pode digitar?', canal);
        return;
      }
      console.log(`[${telefone}] Transcricao: "${texto}"`);
    } else {
      await enviarTexto(jidEnvio, 'Por enquanto so consigo responder texto e audio. Como posso ajudar?', canal);
      return;
    }

    const historico = await buscarHistorico(telefone);

    // Se agendamento já foi encaminhado, Sara para de responder completamente
    const jaEncaminhado = historico.some(h => h.conteudo?.includes('[Agendamento encaminhado para Dra. Barbara]'));
    if (jaEncaminhado) {
      console.log(`[${telefone}] Agendamento ja encaminhado — Sara nao responde mais.`);
      return;
    }

    const { resposta, ferramentas } = await chamarClaude(telefone, nome, texto, historico);

    // Executar ferramentas
    let encaminhou = false;
    for (const ferramenta of ferramentas) {
      if (ferramenta.nome === 'solicitar_agendamento') {
        await executarFerramenta(ferramenta, telefone, canal);
        encaminhou = true;
      }
    }

    if (encaminhou) {
      salvarMensagem(telefone, 'user', texto);
      salvarMensagem(telefone, 'assistant', '[Agendamento encaminhado para Dra. Barbara]');
      await enviarTexto(jidEnvio, 'Anotei tudo! Vou passar seu pedido para a Dra. Bárbara.|||Ela entrará em contato em breve para confirmar o horário.', canal);
      return;
    }

    if (resposta) {
      const partes = resposta.split('|||').map(p => p.trim()).filter(p => p.length > 0);
      for (const parte of partes) {
        await enviarTexto(jidEnvio, parte, canal);
        if (partes.length > 1) await new Promise(r => setTimeout(r, 1500));
      }
    }

    salvarMensagem(telefone, 'user', texto);
    salvarMensagem(telefone, 'assistant', resposta || '');
  } finally {
    emProcessamento.delete(telefone);
    resolverLock();
  }
}

module.exports = { processarMensagem };
