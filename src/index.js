require('module-alias/register');
require('dotenv').config();

const { Telegraf } = require('telegraf');
const setupHandlers = require('@handlers/indexHandler');
const { botMiddleware } = require('@middlewares/bot');
const { scheduleFollowUp } = require('@handlers/followupHandler');

// Configuração inicial
console.log('=== INICIALIZAÇÃO DO BOT ===');
console.log('Modo:', process.env.NODE_ENV || 'development');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  handlerTimeout: 60000,
  telegram: { webhookReply: false }
});

// Registra middlewares e handlers
botMiddleware(bot);
setupHandlers(bot);

// Inicia o bot
bot.launch()
  .then(() => console.log('🟢 BOT INICIADO COM SUCESSO'))
  .catch(err => {
    console.error('🔴 ERRO AO INICIAR BOT:', err);
    process.exit(1);
  });

// Gerenciamento de shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));