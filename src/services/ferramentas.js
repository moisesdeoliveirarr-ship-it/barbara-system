const { notificarAgendamento } = require('./telegram');

async function executarFerramenta(ferramenta, telefone, canal) {
  const { nome, input } = ferramenta;
  console.log(`[ferramenta] ${nome}`, JSON.stringify(input));

  try {
    switch (nome) {
      case 'solicitar_agendamento': {
        const { nome: nomePaciente, procedimento, horario_desejado, observacoes } = input;
        const linhaObs = observacoes ? `\nObservacoes: ${observacoes}` : '';
        const msg =
          `Novo pedido de agendamento!\n\n` +
          `Paciente: ${nomePaciente}\n` +
          `WhatsApp: ${telefone}\n` +
          `Procedimento: ${procedimento}\n` +
          `Horario desejado: ${horario_desejado}` +
          linhaObs +
          `\n\nAssuma a conversa no WhatsApp para confirmar o horario no Simple Dental.`;
        await notificarAgendamento(msg, telefone);
        console.log('[ferramenta] Telegram enviado para Dra. Barbara');
        break;
      }

      default:
        console.warn(`Ferramenta desconhecida: ${nome}`);
    }
  } catch (err) {
    console.error(`Erro ao executar ferramenta ${nome}:`, err.message);
  }
}

module.exports = { executarFerramenta };
