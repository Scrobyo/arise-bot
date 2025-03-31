// src/handlers/indexHandler.js
const userHandler = require("@handlers/userHandler");
const paymentHandler = require("@handlers/paymentHandler");
const followupHandler = require("@handlers/followupHandler");
const { messagesHandler } = require("@handlers/messagesHandler");

module.exports = function setupHandlers(bot) {
  // Middleware de log inicial
  bot.use(async (ctx, next) => {
    console.log(`[${new Date().toISOString()}] Update:`, ctx.updateType);
    return next();
  });

  // Registra todos os handlers
  messagesHandler(bot);
  userHandler(bot);
  paymentHandler(bot);
  followupHandler(bot);

  // Handler de erro global
  bot.catch((err, ctx) => {
    console.error("Erro não tratado:", err);
    ctx.reply("❌ Ocorreu um erro interno").catch(console.error);
  });

  console.log("✅ Todos os handlers foram registrados");
};
