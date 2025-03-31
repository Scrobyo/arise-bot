const path = require('path');
const { Markup } = require('telegraf');
const fs = require('fs');
const users = require('@firebase/users');
const tracker = require('@firebase/tracker');
const subscriptions = require('@firebase/subscriptions');
const { cleanMessage } = require('@utils/messageFormatter');
const { getCollection } = require('@firebase/client');
const usersCol = getCollection('users');
const { createPixPayment, verifyPayment } = require('@mercadopago/indexMercadoPago');

module.exports = {
    privateHandler: (bot) => {
        // Mensagens organizadas
        const messages = {
            welcome1: (firstName) => cleanMessage(`👋 Olá <b>${firstName}</b>, seja bem-vindo ao <b>Cria do Only!</b>`),
            welcome3: cleanMessage(`
    📢 <b>O grupo com ONLYFANS & PRIVACY mais COMPLETO do TELEGRAM!</b>

    ✅ +700 criadoras de conteúdo
    ✅ 200 mil mídias
    ✅ Mídias organizadas por #hashtag e nome
    ✅ Bônus e sorteios
    `),
            welcome4: cleanMessage(`💎 <b>Selecione seu plano VIP:</b>`),
            followUp: (firstName) => cleanMessage(`
      👋 <b>${firstName}</b>, vi que você ficou super interessado, mas ainda não finalizou sua compra!
      
      💡 <b>Que tal agora? É super rápido:</b>
        `),
            paymentDisabled: cleanMessage(`⚠️ <b>Sistema de pagamentos temporariamente desativado</b>\n\nEstamos melhorando nossa estrutura de pagamentos. Volte em breve!`)
        };

        // Timers para mensagens de follow-up
        const followUpTimers = new Map();

        // Middleware de logging para todas as mensagens
        bot.use(async (ctx, next) => {
            console.log('📩 Nova mensagem:', {
                type: ctx.updateType,
                text: ctx.message?.text || ctx.callbackQuery?.data,
                from: ctx.from.id
            });
            await next();
        });

        const handleUser = async (ctx) => {
            const user = ctx.from;
            try {
                const userExists = await users.exists(user.id);

                if (!userExists) {
                    await users.register(user);
                    console.log(`✅ Novo usuário registrado: ${user.id}`);
                }

                // Registra apenas a interação
                await tracker.track(user.id);
                console.log(`➡️ Interação registrada para ${user.id}`);
            } catch (error) {
                console.error('❌ Erro no registro:', error);
            }
        };

        // Função para enviar a sequência completa
        const sendFullSequence = async (ctx) => {
            const user = ctx.from;
            try {
                await ctx.replyWithChatAction('typing');
                await handleUser(ctx);

                // Mensagem 1
                await ctx.replyWithHTML(messages.welcome1(user.first_name));

                // Mensagem 2
                await ctx.replyWithChatAction('typing');
                await ctx.replyWithHTML(messages.welcome3);

                // Mensagem 3 (vídeo)
                const videoPath = path.join(__dirname, '../assets/intro-video.mp4');
                try {
                    if (fs.existsSync(videoPath)) {
                        await ctx.replyWithChatAction('upload_video');
                        await ctx.replyWithVideo(
                            { source: fs.createReadStream(videoPath) },
                            {
                                caption: "🎬 <b>E tem muito mais da Emily Ferrer!</b>",
                                parse_mode: 'HTML'
                            }
                        );
                    }
                } catch (videoError) {
                    console.error('❌ Erro ao enviar vídeo:', videoError);
                }

                // Mensagem 4 com botões
                await ctx.replyWithChatAction('typing');
                const paymentButtons = Markup.inlineKeyboard([
                    [Markup.button.callback('1 Mês - R$19,90', 'vip_1')],
                    [Markup.button.callback('3 Meses - R$29,90', 'vip_3')],
                    [Markup.button.callback('6 Meses - R$39,90', 'vip_6')],
                    [Markup.button.callback('VITALÍCIO (+VENDIDO) - R$49,90', 'vip_life')]
                ]);
                await ctx.replyWithHTML(messages.welcome4, paymentButtons);

                // Agenda follow-up
                scheduleFollowUp(ctx);

            } catch (error) {
                console.error('❌ Erro ao enviar sequência:', error);
                await ctx.reply('⚠️ Ocorreu um erro. Tente novamente!');
            }
        };

        // Agenda mensagem de follow-up
        const scheduleFollowUp = async (ctx) => {
            const userId = ctx.from.id;

            try {
                // Verifica se já tem assinatura ativa
                const hasSubscription = await subscriptions.hasActiveSubscription(userId);
                if (hasSubscription) return;

                if (followUpTimers.has(userId)) {
                    clearTimeout(followUpTimers.get(userId));
                }

                const timer = setTimeout(async () => {
                    try {
                        const stillNoSubscription = !(await subscriptions.hasActiveSubscription(userId));
                        if (stillNoSubscription) {
                            const paymentButtons = Markup.inlineKeyboard([
                                [Markup.button.callback('1 Mês - R$19,90', 'vip_1')],
                                [Markup.button.callback('3 Meses - R$29,90', 'vip_3')],
                                [Markup.button.callback('6 Meses - R$39,90', 'vip_6')],
                                [Markup.button.callback('VITALÍCIO (+VENDIDO) - R$49,90', 'vip_life')]
                            ]);

                            await ctx.replyWithHTML(
                                messages.followUp(ctx.from.first_name),
                                paymentButtons
                            );
                        }
                    } catch (error) {
                        console.error('❌ Erro no follow-up:', error);
                    }
                    followUpTimers.delete(userId);
                }, 10 * 60 * 1000); // 10 minutos

                followUpTimers.set(userId, timer);
            } catch (error) {
                console.error('Erro ao agendar follow-up:', error);
            }
        };

        // Handlers simplificados:
        bot.command('start', async (ctx) => {
            await sendFullSequence(ctx);
        });

        bot.on('text', async (ctx) => {
            if (!ctx.message.text.startsWith('/')) {
                await sendFullSequence(ctx);
            }
        });

        // Substitua o handler VIP por:
        bot.action(/vip_(1|3|6|life)/, async (ctx) => {
            const userId = ctx.from.id;
            const planType = ctx.match[0];

            try {
                await ctx.answerCbQuery();
                await ctx.replyWithChatAction('typing');

                // Gera o PIX usando a função renomeada
                const { qr_code, pix_code, payment_id } = await createPixPayment(userId, planType);

                await ctx.replyWithPhoto(
                    { url: `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qr_code)}` },
                    {
                        caption: `<b>PIX para VIP 1 MÊS</b>\n\n` +
                            `<b>Valor:</b> R$19,90\n` +
                            `<b>Validade:</b> 30 minutos\n\n` +
                            `<b>Código PIX (Copia e Cola):</b>\n<code>${pix_code}</code>`,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ Já Paguei (Verificar)', callback_data: `check_payment_${payment_id}` }],
                                [{ text: '🔁 Gerar Novo PIX', callback_data: 'show_plans' }]
                            ]
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao gerar PIX:', error);
                await ctx.reply('❌ Ocorreu um erro ao gerar o PIX. Tente novamente!');
            }
        });

        // E atualize o handler de verificação:
        bot.action(/check_payment_(.*)/, async (ctx) => {
            const paymentId = ctx.match[1];

            try {
                await ctx.answerCbQuery('🔍 Verificando pagamento...');
                const status = await verifyPayment(paymentId);

                if (status === 'approved') {
                    await ctx.reply('🎉 *Pagamento confirmado!* Seu VIP foi ativado com sucesso!', {
                        parse_mode: 'Markdown'
                    });
                } else {
                    await ctx.reply('⚠️ *Pagamento ainda não identificado.*\n\nSe você já pagou, aguarde 2 minutos e tente novamente.', {
                        parse_mode: 'Markdown'
                    });
                }
            } catch (error) {
                console.error('Erro ao verificar pagamento:', error);
                await ctx.reply('❌ Erro ao verificar pagamento. Tente novamente mais tarde.');
            }
        });

        // Adicione esta função auxiliar
        function getPlanPrice(planType) {
            const prices = {
                vip_1: '19,90',
                vip_3: '29,90',
                vip_6: '39,90',
                vip_life: '49,90'
            };
            return prices[planType] || '00,00';
        }

        bot.action(/copy_pix_(.*)/, async (ctx) => {
            await handleUser(ctx, 'pix_copy');
            await ctx.answerCbQuery('⚠️ Sistema desativado');
            await ctx.replyWithHTML(messages.paymentDisabled);
        });

        bot.action('show_plans', async (ctx) => {
            await ctx.answerCbQuery();
            await sendFullSequence(ctx);
        });

        console.log('✅ Handler privado carregado com tracking ativado');
    }
};