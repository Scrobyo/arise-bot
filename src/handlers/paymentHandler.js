const {
  createPixPayment,
  verifyPayment,
} = require("@mercadopago/indexMercadoPago");
const { Markup } = require("telegraf");
const { getCollection } = require("@firebase/client");
const { sendVIPWelcome } = require("@handlers/messagesHandler");

// Funções auxiliares
const getPlanDetails = (planType) => {
  const plans = {
    vip_1: { name: "VIP 1 MÊS", price: "19,90" },
    vip_3: { name: "VIP 3 MESES", price: "29,90" },
    vip_6: { name: "VIP 6 MESES", price: "39,90" },
    vip_life: { name: "VIP VITALÍCIO", price: "49,90" },
  };
  return plans[planType] || { name: "VIP", price: "00,00" };
};

const escapeHtml = (text) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function registerPayment(userId, paymentData) {
  const paymentsCol = getCollection("payments");
  const { paymentId, ...data } = paymentData;

  if (!paymentId) {
    throw new Error("paymentId inválido ou indefinido!"); // Verifica se paymentId está indefinido
  }

  await paymentsCol.doc(String(paymentId)).set({
    userId,
    paymentId: String(paymentId), // Aqui estamos incluindo o campo paymentId explicitamente
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

// Handler principal de pagamento
async function handlePayment(ctx, planType) {
  if (!ctx?.from?.id) {
    console.error("Contexto inválido no handlePayment");
    return ctx?.answerCbQuery?.("❌ Erro no sistema").catch(console.error);
  }

  try {
    await ctx.answerCbQuery();
    await ctx.replyWithChatAction("upload_photo");

    const { qr_code, pix_code, payment_id } = await createPixPayment(
      ctx.from.id,
      planType
    );

    console.log("ID do pagamento gerado:", payment_id); // ADICIONE ISSO
    const { name, price } = getPlanDetails(planType);

    // Registra o pagamento no Firebase
    await registerPayment(ctx.from.id, {
      paymentId: payment_id, // Este será o ID do documento
      amount: parseFloat(price.replace(",", ".")),
      planType: planType,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    console.log(`Pagamento registrado para ${ctx.from.id} (${payment_id})`);

    const paymentKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "✅ Já Paguei (Verificar)",
          `check_payment_${payment_id}`
        ),
      ],
      [Markup.button.callback("🔁 Gerar Novo PIX", "show_plans")],
      [Markup.button.url("❓ Ajuda", "https://t.me/Scrobyo")],
    ]);

    await ctx.replyWithPhoto(
      {
        url: `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
          qr_code
        )}`,
      },
      {
        caption:
          `<b>PIX para ${name}</b>\n\n` +
          `<b>Valor:</b> R$${price}\n` +
          `<b>Validade:</b> 30 minutos\n\n` +
          `<b>Código PIX:</b>\n<code>${escapeHtml(pix_code)}</code>\n\n` +
          'Após pagar, clique em "✅ Já Paguei" para verificação automática',
        parse_mode: "HTML",
        reply_markup: paymentKeyboard.reply_markup,
      }
    );

    await ctx.replyWithHTML(
      "<b>INSTRUÇÕES PARA PAGAMENTO:</b>\n\n" +
        "1️⃣ Use o QR Code ou código PIX acima\n" +
        "2️⃣ O valor deve ser <b>exato</b>\n" +
        '3️⃣ Após pagar, clique em "✅ Já Paguei"\n' +
        "4️⃣ Aguarde a confirmação automática\n\n" +
        "⚠️ <i>O PIX expira em 30 minutos</i>"
    );
  } catch (error) {
    console.error("Erro no pagamento:", error);
    await ctx.replyWithHTML(
      "❌ <b>Erro ao gerar PIX</b>\n\nTente novamente ou entre em contato com @Scrobyo"
    );
    await ctx.answerCbQuery("❌ Falha ao gerar PIX").catch(console.error);
  }
}

// Handler de verificação de pagamento
async function handlePaymentVerification(ctx, paymentId) {
  try {
    await ctx.answerCbQuery("🔍 Verificando pagamento...");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const status = await verifyPayment(paymentId);
    const {
      updatePaymentStatus,
      createSubscriptionFromPayment,
    } = require("@firebase/subscriptions");

    if (status === "approved") {
      console.log(`Tentando atualizar status para ${paymentId}`);
      await updatePaymentStatus(paymentId, "approved");

      // Cria a assinatura
      const subscription = await createSubscriptionFromPayment(paymentId);

      // Envia mensagem de confirmação
      await ctx.replyWithHTML(
        "🎉 <b>Pagamento confirmado com sucesso!</b>\n\n" +
          "✅ Seu acesso VIP está sendo ativado...\n" +
          "⏳ Aguarde alguns segundos..."
      );

      // Opcional: Enviar mensagem de boas-vindas VIP
      await sendVIPWelcome(ctx, subscription.planType);
    } else if (status === "pending") {
      await ctx.replyWithHTML(
        "⏳ <b>Pagamento ainda não confirmado</b>\n\n" +
          "O pagamento foi detectado mas ainda não foi aprovado.\n" +
          "Por favor, aguarde alguns minutos e tente novamente."
      );
    } else {
      await ctx.replyWithHTML(
        "⚠️ <b>Pagamento não identificado</b>\n\n" +
          "Se você já efetuou o pagamento:\n" +
          "1️⃣ Aguarde <b>2-5 minutos</b>\n" +
          "2️⃣ Tente verificar novamente\n\n" +
          "❗ Se o problema persistir, envie o comprovante para @Scrobyo"
      );
    }
  } catch (error) {
    console.error(`Falha completa na verificação:`, error);
    await ctx.replyWithHTML(
      "❌ <b>Falha no sistema</b>\n\n" +
        "Não foi possível verificar seu pagamento.\n\n" +
        "Por favor, envie para @Scrobyo:\n" +
        "1. Comprovante de pagamento\n" +
        `2. Código: ${paymentId}`
    );
  }
}

// Função auxiliar para texto de expiração
function getExpirationDateText(planType) {
  const plans = {
    vip_1: "1 mês",
    vip_3: "3 meses",
    vip_6: "6 meses",
    vip_life: "VITALÍCIO",
  };
  return plans[planType] || "período indeterminado";
}

// Exporta como função de handler
module.exports = function paymentHandler(bot) {
  // Handler para seleção de planos
  bot.action(/vip_(1|3|6|life)/, async (ctx) => {
    await handlePayment(ctx, ctx.match[0]);
  });

  // Handler para verificação de pagamento
  bot.action(/check_payment_(.*)/, async (ctx) => {
    await handlePaymentVerification(ctx, ctx.match[1]);
  });

  // Handler para mostrar planos novamente
  bot.action("show_plans", async (ctx) => {
    await ctx.deleteMessage();
    await ctx.replyWithHTML(
      "💎 <b>Selecione seu plano VIP:</b>",
      Markup.inlineKeyboard([
        [Markup.button.callback("1 MÊS - R$ 19,90", "vip_1")],
        [Markup.button.callback("3 MESES - R$ 29,90", "vip_3")],
        [Markup.button.callback("6 MESES - R$ 39,90", "vip_6")],
        [Markup.button.callback("VITALÍCIO - R$ 49,90", "vip_life")],
      ])
    );
  });
};
