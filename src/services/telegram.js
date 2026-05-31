const TelegramBot = require('node-telegram-bot-api');
const { getAviso, setAviso, limparAviso } = require('../db/aviso');

let bot = null;

function iniciarTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN nao configurado — bot desativado');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `Ola Dra. Barbara! Seu chat ID e: ${msg.chat.id}\n\n` +
      `Adicione no Railway:\nTELEGRAM_CHAT_ID = ${msg.chat.id}\n\n` +
      `Comandos disponiveis:\n` +
      `/aviso <texto> — registra aviso para a Sara\n` +
      `/limpar — remove aviso ativo\n` +
      `/status — ver aviso atual`
    );
  });

  bot.onText(/\/status/, async (msg) => {
    const aviso = await getAviso();
    const texto = aviso
      ? `Aviso ativo:\n"${aviso}"\n\nPara remover: /limpar`
      : 'Sem aviso ativo. Sara pode encaminhar agendamentos normalmente.';
    await bot.sendMessage(msg.chat.id, texto);
  });

  bot.onText(/\/limpar/, async (msg) => {
    await limparAviso();
    await bot.sendMessage(msg.chat.id, 'Aviso removido. Sara pode encaminhar agendamentos normalmente.');
  });

  bot.onText(/\/aviso (.+)/, async (msg, match) => {
    const texto = match[1];
    await setAviso(texto, null);
    await bot.sendMessage(msg.chat.id, `Aviso registrado:\n"${texto}"\n\nFica ativo ate voce mandar /limpar`);
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const lower = msg.text.toLowerCase();

    if (lower.includes('limpar aviso') || lower.includes('pode agendar') || lower.includes('libera') || lower.includes('ja passei') || lower.includes('já passei')) {
      await limparAviso();
      await bot.sendMessage(msg.chat.id, 'Aviso removido. Sara pode encaminhar agendamentos normalmente.');
      return;
    }

    await setAviso(msg.text, null);
    await bot.sendMessage(msg.chat.id, `Anotado. Sara vai respeitar essa instrucao.\nFica ativo ate voce mandar /limpar`);
  });

  console.log('[telegram] Bot iniciado com polling');
}

async function notificarTelegram(texto) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chatId) return;
  try {
    await bot.sendMessage(chatId, texto);
  } catch (err) {
    console.error('[telegram] Erro ao enviar notificacao:', err.message);
  }
}

module.exports = { iniciarTelegram, notificarTelegram };
