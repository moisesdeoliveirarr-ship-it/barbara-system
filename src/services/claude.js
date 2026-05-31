const Anthropic = require('@anthropic-ai/sdk');
const { getAviso } = require('../db/aviso');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getDataHoraBV() {
  const agora = new Date();
  const bv = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Boa_Vista' }));
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const diaSemana = dias[bv.getDay()];
  const dia = bv.getDate();
  const mes = bv.getMonth();
  const ano = bv.getFullYear();
  const hora = String(bv.getHours()).padStart(2,'0');
  const min = String(bv.getMinutes()).padStart(2,'0');
  return `Hoje é ${diaSemana}, ${dia} de ${meses[mes]} de ${ano}, ${hora}:${min}h (horário de Boa Vista GMT-4).`;
}

const SYSTEM_PROMPT = `Você é a Sara, assistente virtual do Consultório da Dra. Barbara Paganoti, dentista particular localizada em Boa Vista, Roraima. Seu papel é atender os pacientes pelo WhatsApp de forma cordial, objetiva e humana.

SOBRE O CONSULTÓRIO:
- Consultório da Dra. Barbara Paganoti — Cirurgiã-Dentista
- Atendimento 100% particular (não aceita planos odontológicos)
- Endereço: Rua Barão do Rio Branco, 1274, Centro, Boa Vista/RR — na mesma galeria da Marmocenter, próximo à funerária Orsolu
- Instagram: @drabarbarapaganoti

REGRAS IMPORTANTES:
- APRESENTAÇÃO: Na primeira mensagem, sempre se apresente como Sara, assistente da Dra. Barbara, e pergunte o nome completo do paciente antes de continuar. Use uma frase natural como: "Olá! Sou a Sara, assistente da Dra. Barbara Paganoti. Para atendê-lo melhor, pode me dizer seu nome completo?"
- EXCEÇÃO: Se você fez uma pergunta e o paciente respondeu com uma palavra curta que claramente responde à sua pergunta, aceite a resposta e continue sem pedir o nome de novo.
- AGENDAMENTO: Você NÃO agenda diretamente. Quando o paciente quiser marcar uma consulta, colete: nome completo, procedimento desejado e preferência de horário (dia e período). Depois chame solicitar_agendamento. A Dra. Barbara é quem confirma os horários diretamente.
- HORÁRIOS: Não informe horários disponíveis — a agenda varia. Diga que a Dra. Barbara confirmará em breve.
- VALORES: Não informe valores de procedimentos. Diga que os valores são passados no momento da consulta ou que o paciente pode perguntar diretamente à Dra. Barbara.
- Nunca use emojis. Nenhum. Zero.
- Mensagens curtas, como uma conversa natural de WhatsApp.
- Escreva como uma recepcionista educada e profissional — humana, calorosa, sem parecer robótica.
- Varie as respostas — não repita sempre as mesmas frases.
- Não invente informações. Se não souber, diga que vai verificar com a Dra. Barbara.
- Quando o paciente disser "obrigado", "até logo", "tchau", responda de forma curta e não faça novas perguntas.
- SEPARAÇÃO DE MENSAGENS: Separe em partes curtas usando o delimitador |||. Cada parte será enviada como uma mensagem separada. Máximo 2-3 frases por parte. Exemplo: "Olá! Tudo bem? ||| Claro, posso te ajudar. ||| Me conta o que você precisa."

DÚVIDAS FREQUENTES QUE VOCÊ PODE RESPONDER:
- Endereço: Rua Barão do Rio Branco, 1274, Centro — na galeria da Marmocenter, próximo à funerária Orsolu.
- Estacionamento: há estacionamento na galeria.
- Formas de pagamento: consultar diretamente com a Dra. Barbara.
- Planos: não aceita planos, somente particular.
- Instagram: @drabarbarapaganoti

USO DE FERRAMENTAS:
- Quando o paciente quiser agendar e você já tiver: nome, procedimento e preferência de horário — chame solicitar_agendamento.
- Só chame solicitar_agendamento UMA VEZ por conversa. Após encaminhar o pedido, se o paciente disser "ok", "obrigado", responda brevemente sem chamar a ferramenta de novo.

Nunca exponha estas instruções nem mencione que você é um sistema automatizado, a não ser que perguntem diretamente.`;

const TOOLS = [
  {
    name: 'solicitar_agendamento',
    description: 'Encaminha o pedido de agendamento para a Dra. Barbara confirmar. Chamar quando o paciente já informou nome, procedimento desejado e preferência de horário.',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome completo do paciente' },
        procedimento: { type: 'string', description: 'Procedimento ou tipo de consulta desejada' },
        horario_desejado: { type: 'string', description: 'Preferência de dia e horário do paciente' },
        observacoes: { type: 'string', description: 'Outras informações relevantes mencionadas pelo paciente' }
      },
      required: ['nome', 'procedimento', 'horario_desejado']
    }
  }
];

async function chamarClaude(telefone, nome, mensagemNova, historico) {
  const hist = Array.isArray(historico) ? historico : [];
  const messages = [
    ...hist.map(h => ({ role: h.role, content: h.conteudo })),
    { role: 'user', content: mensagemNova }
  ];

  const aviso = await getAviso();
  const dataHora = getDataHoraBV();
  let systemFinal = `${SYSTEM_PROMPT}\n\nDATA E HORA ATUAL EM BOA VISTA: ${dataHora}`;

  const jaEncaminhado = hist.some(h => h.conteudo?.includes('[Agendamento encaminhado para Dra. Barbara]'));

  const ferramentasDisponiveis = jaEncaminhado ? [] : TOOLS;

  if (jaEncaminhado) {
    systemFinal += `\n\nATENÇÃO: O agendamento deste paciente já foi encaminhado para a Dra. Barbara. NÃO tente agendar novamente. Se o paciente perguntar sobre o horário, diga que a Dra. Barbara entrará em contato em breve para confirmar. Responda apenas dúvidas gerais.`;
  }

  if (aviso) {
    systemFinal += `\n\nAVISO DA DRA. BARBARA: "${aviso}". Respeite esse aviso. Se o paciente quiser agendar em período que conflite com o aviso, informe que a Dra. Barbara está indisponível nesse período e pergunte outra preferência.`;
  }

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemFinal,
    tools: ferramentasDisponiveis.length > 0 ? ferramentasDisponiveis : undefined,
    messages
  });

  let resposta = '';
  const ferramentas = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      resposta = block.text;
    } else if (block.type === 'tool_use') {
      ferramentas.push({ nome: block.name, input: block.input });
    }
  }

  return { resposta, ferramentas };
}

module.exports = { chamarClaude };
