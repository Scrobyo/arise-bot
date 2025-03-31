const { createPixPayment, verifyPayment } = require('@mercadopago/indexMercadoPago');
const { Markup } = require('telegraf');
const { getCollection } = require('@firebase/client');

// Funções auxiliares
const getPlanDetails = (planType) => {
    const plans = {
        vip_1: { name: 'VIP 1 MÊS', price: '19,90' },
        vip_3: { name: 'VIP 3 MESES', price: '29,90' },
        vip_6: { name: 'VIP 6 MESES', price: '39,90' },
        vip_life: { name: 'VIP VITALÍCIO', price: '49,90' }
    };
    return plans[planType] || { name: 'VIP', price: '00,00' };
};

const escapeHtml = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Função para registrar pagamento no Firebase
async function registerPayment(userId, paymentData) {
    const paymentsCol = getCollection('payments');
    await paymentsCol.add({
        userId,
        ...paymentData,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
}

// Handler principal de pagamento
async function handlePayment(ctx, planType) {
    if (!ctx?.from?.id) {
        console.error('Contexto inválido no handlePayment');
        return ctx?.answerCbQuery?.('❌ Erro no sistema').catch(console.error);
    }

    try {
        await ctx.answerCbQuery();
        await ctx.replyWithChatAction('upload_photo');

        const { qr_code, pix_code, payment_id } = await createPixPayment(ctx.from.id, planType);
        const { name, price } = getPlanDetails(planType);

        // Registra o pagamento no Firebase
        await registerPayment(ctx.from.id, {
            paymentId: payment_id,
            amount: parseFloat(price.replace(',', '.')),
            planType: planType,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });

        console.log(`Pagamento registrado para ${ctx.from.id} (${payment_id})`);

        const paymentKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✅ Já Paguei (Verificar)', `check_payment_${payment_id}`)],
            [Markup.button.callback('🔁 Gerar Novo PIX', 'show_plans')],
            [Markup.button.url('❓ Ajuda', 'https://t.me/Scrobyo')]
        ]);

        await ctx.replyWithPhoto(
            { url: `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qr_code)}` },
            {
                caption: `<b>PIX para ${name}</b>\n\n` +
                    `<b>Valor:</b> R$${price}\n` +
                    `<b>Validade:</b> 30 minutos\n\n` +
                    `<b>Código PIX:</b>\n<code>${escapeHtml(pix_code)}</code>\n\n` +
                    'Após pagar, clique em "✅ Já Paguei" para verificação automática',
                parse_mode: 'HTML',
                reply_markup: paymentKeyboard.reply_markup
            }
        );

        await ctx.replyWithHTML(
            '<b>INSTRUÇÕES PARA PAGAMENTO:</b>\n\n' +
            '1️⃣ Use o QR Code ou código PIX acima\n' +
            '2️⃣ O valor deve ser <b>exato</b>\n' +
            '3️⃣ Após pagar, clique em "✅ Já Paguei"\n' +
            '4️⃣ Aguarde a confirmação automática\n\n' +
            '⚠️ <i>O PIX expira em 30 minutos</i>'
        );

    } catch (error) {
        console.error('Erro no pagamento:', error);
        await ctx.replyWithHTML('❌ <b>Erro ao gerar PIX</b>\n\nTente novamente ou entre em contato com @Scrobyo');
        await ctx.answerCbQuery('❌ Falha ao gerar PIX').catch(console.error);
    }
}

// Handler de verificação de pagamento
async function handlePaymentVerification(ctx, paymentId) {
    try {
        await ctx.answerCbQuery('🔍 Verificando pagamento...');

        const status = await verifyPayment(paymentId);

        if (status === 'approved') {
            await ctx.replyWithHTML(
                '🎉 <b>Pagamento confirmado!</b>\n\n' +
                'A equipe irá ativar seu acesso em breve!\n\n' +
                '📌 Você receberá uma confirmação por aqui\n' +
                '📩 Caso não receba, contate @Scrobyo'
            );

            // Aqui você pode adicionar a lógica para atualizar o status no Firebase
            // Ex: await updatePaymentStatus(paymentId, 'approved');

        } else {
            await ctx.replyWithHTML(
                '⚠️ <b>Pagamento não identificado</b>\n\n' +
                'Se você já efetuou o pagamento:\n' +
                '1️⃣ Aguarde <b>2-5 minutos</b>\n' +
                '2️⃣ Tente verificar novamente\n\n' +
                '❗ Se o problema persistir, envie o comprovante para @Scrobyo'
            );
        }
    } catch (error) {
        console.error('Erro na verificação:', error);
        await ctx.replyWithHTML('❌ <b>Erro na verificação</b>\n\nPor favor, tente novamente mais tarde.');
    }
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
    bot.action('show_plans', async (ctx) => {
        await ctx.deleteMessage();
        await ctx.replyWithHTML('💎 <b>Selecione seu plano VIP:</b>',
            Markup.inlineKeyboard([
                [Markup.button.callback('1 MÊS - R$ 19,90', 'vip_1')],
                [Markup.button.callback('3 MESES - R$ 29,90', 'vip_3')],
                [Markup.button.callback('6 MESES - R$ 39,90', 'vip_6')],
                [Markup.button.callback('VITALÍCIO - R$ 49,90', 'vip_life')]
            ])
        );
    });
};