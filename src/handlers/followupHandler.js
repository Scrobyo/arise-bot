const { Markup } = require('telegraf');
const subscriptions = require('@firebase/subscriptions');

const followUpTimers = new Map();

module.exports = function followupHandler(bot) {
    // Armazena a instância do bot
    this.bot = bot;

    // Middleware para registrar interações
    bot.use(async (ctx, next) => {
        try {
            if (ctx.from?.id) {
                await scheduleFollowUp(ctx);
            }
        } catch (error) {
            console.error('Erro no middleware de follow-up:', error);
        }
        return next();
    });
};

async function scheduleFollowUp(ctx) {
    if (!ctx?.from?.id) return;

    try {
        const userId = ctx.from.id;
        const firstName = ctx.from.first_name || 'amigo';
        const bot = ctx.telegram; // Captura a instância do bot do contexto

        // Limpa timer existente
        if (followUpTimers.has(userId)) {
            clearTimeout(followUpTimers.get(userId));
            followUpTimers.delete(userId);
        }

        // Verifica assinatura ativa
        if (await subscriptions.hasActiveSubscription(userId)) return;

        // Agenda novo follow-up (1 minuto para teste)
        const timer = setTimeout(async () => {
            try {
                if (!(await subscriptions.hasActiveSubscription(userId))) {
                    await sendFollowUpMessage(bot, userId, firstName);
                }
            } catch (error) {
                console.error('❌ Erro ao enviar follow-up:', error);
            } finally {
                followUpTimers.delete(userId);
            }
        }, 1 * 60 * 1000); // 1 minuto para testes

        followUpTimers.set(userId, timer);
    } catch (error) {
        console.error('Erro ao agendar:', error);
    }
}

async function sendFollowUpMessage(bot, userId, firstName) {
    const followUpMessage = `
✨ <b>${firstName}, seu acesso VIP está esperando por você!</b> ✨

👀 <i>Vi que você ficou interessado mas ainda não finalizou...</i>

💎 <b>Não perca esses benefícios:</b>
✅ Acesso a +700 criadoras de conteúdo
✅ 200 mil mídias organizadas
✅ Bônus e sorteios exclusivos
✅ Suporte prioritário

⏳ <b>Oferta especial por tempo limitado!</b>
`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('1 MÊS - R$ 19,90', 'vip_1')],
        [Markup.button.callback('3 MESES - R$ 29,90', 'vip_3')],
        [Markup.button.callback('6 MESES - R$ 39,90', 'vip_6')],
        [Markup.button.callback('VITALÍCIO - R$ 49,90', 'vip_life')],
    ]);

    // Envia a mensagem diretamente usando a API do Telegram
    await bot.sendMessage(userId, followUpMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
    }).catch(error => {
        console.error('Erro ao enviar mensagem:', error);
    });
}

// Exporta para chamadas manuais
module.exports.scheduleFollowUp = scheduleFollowUp;