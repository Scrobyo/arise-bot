const { cleanMessage } = require("@utils/messageFormatter");
const path = require("path");
const { Markup } = require("telegraf");
const { hasActiveSubscription } = require("@firebase/subscriptions");

const messages = {
  welcome1: (firstName) =>
    cleanMessage(
      `👋 Olá <b>${firstName}</b>, seja bem-vindo ao <b>Cria do Only!</b>`
    ),
  welcome3: cleanMessage(`
    📢 <b>O grupo ONLYFANS & PRIVACY mais COMPLETO do TELEGRAM!</b>
    ✅ +700 criadoras de conteúdo
    ✅ 200 mil mídias
    ✅ Mídias organizadas por #hashtag e nome
    ✅ Bônus e sorteios
  `),
  welcome4: cleanMessage(`💎 <b>Selecione seu plano VIP abaixo 👇🏻</b>`),
  welcome5: Markup.inlineKeyboard([
    [Markup.button.callback("1 MÊS - R$ 19,90", "select_plan_1")],
    [Markup.button.callback("3 MESES - R$ 29,90", "select_plan_3")],
    [Markup.button.callback("6 MESES - R$ 39,90", "select_plan_6")],
    [Markup.button.callback("VITALÍCIO - R$ 49,90", "select_plan_life")],
  ]),
  followUp: (firstName) =>
    cleanMessage(`
    👋 <b>${firstName}</b>, vi que você ficou super interessado, mas ainda não finalizou sua compra!
    💡 <b>Que tal agora? É super rápido:</b>
  `),
  paymentDisabled: cleanMessage(
    `⚠️ <b>Sistema de pagamentos temporariamente desativado</b>`
  ),

  vipWelcome: (firstName, planType, expiration) =>
    cleanMessage(`
    🎉 <b>PARABÉNS ${firstName}!</b>
    
    ✅ Seu plano <b>VIP</b> foi ativado com sucesso!
  `),

  vipAccessInstructions: cleanMessage(`
    📲 <b>COMO ACESSAR OS GRUPOS:</b>
    
    1. Clique no botão abaixo
    2. Se aparecer "Grupo privado", clique em "Entrar"
    3. Se pedir confirmação, aguarde alguns segundos
    
    ⚠️ Se tiver problemas, contate @Scrobyo
  `),
};

// Função para enviar mensagem VIP (pode ser chamada de outros handlers)
async function sendVIPWelcome(ctx, planType = "existing_user") {
  try {
    const firstName = ctx.from?.first_name || "VIP";
    const planNames = {
      vip_1: "VIP 1 MÊS",
      vip_3: "VIP 3 MESES",
      vip_6: "VIP 6 MESES",
      vip_life: "VIP VITALÍCIO",
      existing_user: "VIP ATIVO",
    };

    const expirationText = {
      vip_1: "30 dias a partir de hoje",
      vip_3: "90 dias a partir de hoje",
      vip_6: "180 dias a partir de hoje",
      vip_life: "ACESSO VITALÍCIO",
      existing_user: "conforme seu plano",
    };

    await ctx.replyWithHTML(
      messages.vipWelcome(
        firstName,
        planNames[planType] || "VIP",
        expirationText[planType] || "período indeterminado"
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await ctx.replyWithHTML(messages.vipAccessInstructions);

    await ctx.reply(
      "📲 ACESSO RÁPIDO:",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "👉 GRUPO PRIVADO",
            "https://t.me/+TCMb6krJPNswMTM5"
          ),
        ],
        [Markup.button.url("❓ SUPORTE", "https://t.me/Scrobyo")],
      ])
    );
  } catch (error) {
    console.error("Erro ao enviar mensagem VIP:", error);
  }
}

// Handler para mensagens de texto
async function handleTextMessage(ctx) {
  if (ctx.chat?.type !== "private") return;

  if (await hasActiveSubscription(ctx.from.id)) {
    return sendVIPWelcome(ctx);
  }

  const firstName = ctx.from?.first_name || "usuário";

  try {
    await ctx.replyWithHTML(messages.welcome1(firstName));

    const videoPath = path.join(__dirname, "../assets/intro-video.mp4");
    await ctx.replyWithVideo({
      source: videoPath,
      caption: "🎥 Conheça nosso grupo exclusivo!",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.replyWithHTML(messages.welcome3);
    await ctx.replyWithHTML(messages.welcome4);

    await new Promise((resolve) => setTimeout(resolve, 300));
    await ctx.reply("Planos disponíveis para compra:", messages.welcome5);
  } catch (error) {
    console.error("Erro no fluxo de boas-vindas:", error);
  }
}

// Exportação correta
module.exports = {
  messagesHandler: (bot) => {
    bot.on("text", handleTextMessage);
    console.log("✅ Handler de mensagens carregado (só responde no privado)");
  },
  sendVIPWelcome,
};
