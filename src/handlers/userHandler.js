// src/handlers/userHandler.js
const users = require('@firebase/users');
const tracker = require('@firebase/tracker');
const { scheduleFollowUp } = require('@handlers/followupHandler');

module.exports = function userHandler(bot) {
    // Handler de comando start
    bot.command('start', async (ctx) => {
        try {
            await handleUser(ctx);
            await sendWelcomeSequence(ctx);
            scheduleFollowUp(ctx);
        } catch (error) {
            console.error('Erro no comando start:', error);
        }
    });

    // Handler de mensagens de texto
    bot.on('text', async (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            await handleUser(ctx);
            await sendWelcomeSequence(ctx);
            scheduleFollowUp(ctx);
        }
    });
};

async function handleUser(ctx) {
    if (!ctx?.from?.id) {
        console.error('Contexto inválido no handleUser');
        return;
    }

    try {
        const userExists = await users.exists(ctx.from.id);
        if (!userExists) {
            await users.register(ctx.from);
            console.log(`✅ Novo usuário: ${ctx.from.id}`);
        }
        await tracker.track(ctx.from.id);
    } catch (error) {
        console.error('❌ Erro no registro:', error);
    }
}

async function sendWelcomeSequence(ctx) {
    // Implemente sua sequência de boas-vindas aqui
}