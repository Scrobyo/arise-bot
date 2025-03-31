const { cleanMessage } = require('@utils/messageFormatter');
const path = require('path');
const { Markup } = require('telegraf');

const messages = {
  welcome1: (firstName) => cleanMessage(`👋 Olá <b>${firstName}</b>, seja bem-vindo ao <b>Cria do Only!</b>`),
  welcome3: cleanMessage(`
    📢 <b>O grupo ONLYFANS & PRIVACY mais COMPLETO do TELEGRAM!</b>
    ✅ +700 criadoras de conteúdo
    ✅ 200 mil mídias
    ✅ Mídias organizadas por #hashtag e nome
    ✅ Bônus e sorteios
  `),
  welcome4: cleanMessage(`💎 <b>Selecione seu plano VIP abaixo 👇🏻</b>`),
  welcome5: Markup.inlineKeyboard([
    [Markup.button.callback('1 MÊS - R$ 19,90', 'vip_1')],
    [Markup.button.callback('3 MESES - R$ 29,90', 'vip_3')],
    [Markup.button.callback('6 MESES - R$ 39,90', 'vip_6')],
    [Markup.button.callback('VITALÍCIO - R$ 49,90', 'vip_life')]
  ]),
  followUp: (firstName) => cleanMessage(`
    👋 <b>${firstName}</b>, vi que você ficou super interessado, mas ainda não finalizou sua compra!
    💡 <b>Que tal agora? É super rápido:</b>
  `),
  paymentDisabled: cleanMessage(`⚠️ <b>Sistema de pagamentos temporariamente desativado</b>`)
};

module.exports = function messagesHandler(bot) {
  bot.on('text', async (ctx) => {
    const firstName = ctx.from?.first_name || "usuário";

    try {
      // 1. Saudação inicial
      await ctx.replyWithHTML(messages.welcome1(firstName));

      // 2. Envia vídeo de boas-vindas
      const videoPath = path.join(__dirname, '../assets/intro-video.mp4');
      await ctx.replyWithVideo({
        source: videoPath,
        caption: '🎥 Conheça nosso grupo exclusivo!'
      });

      // Pequeno delay para melhor experiência
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Mensagem com informações
      await ctx.replyWithHTML(messages.welcome3);

      // 4. Call-to-action final
      await ctx.replyWithHTML(messages.welcome4);

      // 5. Botões de assinatura (com delay para melhor UX)
      await new Promise(resolve => setTimeout(resolve, 300));
      await ctx.reply(
        'Planos disponíveis para compra:',
        messages.welcome5
      );

    } catch (error) {
      console.error('Erro no fluxo de boas-vindas:', error);
    }
  });

  console.log('✅ Handler de mensagens carregado (com vídeo e botões)');
};