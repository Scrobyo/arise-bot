// src/handlers/followupHandler.js
const { Markup } = require('telegraf');
const subscriptions = require('@firebase/subscriptions');
const messages = require('@handlers/messagesHandler');

const followUpTimers = new Map();

module.exports = function followupHandler(bot) {
    // Pode adicionar handlers específicos de follow-up se necessário
};

module.exports.scheduleFollowUp = async (ctx) => {
    if (!ctx?.from?.id) {
        console.error('Contexto inválido no scheduleFollowUp');
        return;
    }

    try {
        const hasSubscription = await subscriptions.hasActiveSubscription(ctx.from.id);
        if (hasSubscription) return;

        if (followUpTimers.has(ctx.from.id)) {
            clearTimeout(followUpTimers.get(ctx.from.id));
        }

        const timer = setTimeout(async () => {
            try {
                const stillNoSubscription = !(await subscriptions.hasActiveSubscription(ctx.from.id));
                if (stillNoSubscription) {
                    await ctx.replyWithHTML(
                        messages.followUp(ctx.from.first_name),
                        Markup.inlineKeyboard([
                            [Markup.button.callback('1 Mês - R$19,90', 'vip_1')],
                            [Markup.button.callback('3 Meses - R$29,90', 'vip_3')],
                            [Markup.button.callback('6 Meses - R$39,90', 'vip_6')],
                            [Markup.button.callback('VITALÍCIO - R$49,90', 'vip_life')]
                        ])
                    );
                }
            } catch (error) {
                console.error('❌ Erro no follow-up:', error);
            }
            followUpTimers.delete(ctx.from.id);
        }, 10 * 60 * 1000); // 10 minutos

        followUpTimers.set(ctx.from.id, timer);
    } catch (error) {
        console.error('Erro ao agendar follow-up:', error);
    }
};