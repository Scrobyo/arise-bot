// middlewares/bot.js
module.exports = {
  botMiddleware: (bot) => {
    // Comando de teste de conexão
    bot.command('connection_test', async (ctx) => {
      try {
        const start = Date.now();
        await ctx.reply('Testando conexão...');
        const ping = Date.now() - start;
        await ctx.reply(`✅ Conexão ativa!\nLatência: ${ping}ms`);
        if (ctx.from) {
          console.log(`Teste de conexão bem-sucedido com ${ctx.from.id}`);
        } else {
          console.log('Erro: ctx.from não está definido no comando connection_test');
        }
      } catch (error) {
        console.error('Falha no teste de conexão:', error);
      }
    });

    // Comandos básicos
    bot.command('ping', (ctx) => {
      try {
        if (ctx.from) {
          console.log('🏓 Ping recebido de:', ctx.from.id);
          return ctx.reply('Pong! 🏓');
        } else {
          console.log('Erro: ctx.from não está definido no comando ping');
          return ctx.reply('Erro ao processar o comando ping');
        }
      } catch (error) {
        console.error('Erro ao processar comando ping:', error);
      }
    });

    bot.command('teste', (ctx) => {
      try {
        if (ctx.from) {
          console.log('🧪 Teste recebido de:', ctx.from.id);
          return ctx.reply('✅ Bot operacional!');
        } else {
          console.log('Erro: ctx.from não está definido no comando teste');
          return ctx.reply('Erro ao processar o comando teste');
        }
      } catch (error) {
        console.error('Erro ao processar comando teste:', error);
      }
    });

    // Middleware de administração
    bot.use((ctx, next) => {
      try {
        console.log(`Tipo de atualização recebido: ${ctx.updateType}`);

        if (ctx.updateType === 'message' && ctx.message?.text === '/stop' && ctx.from?.id === 1790032262) {
          console.log('🛑 Desligamento solicitado por admin');
          return ctx.reply('Desligando...').then(() => process.exit(0));
        }
        return next();
      } catch (error) {
        console.error('Erro no middleware de administração:', error);
      }
    });

    console.log('✅ Middleware do bot carregado');
  }
};
