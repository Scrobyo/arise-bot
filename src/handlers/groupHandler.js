const { Telegraf } = require("telegraf");
const { hasActiveSubscription } = require("@firebase/subscriptions");

// Configuração do grupo
const GROUP_ID = process.env.VIP_GROUP_ID || "-1001234567890"; // ID do seu grupo VIP

// Função para verificar e remover membros sem assinatura ativa
async function cleanNonSubscribers(bot) {
  try {
    console.log("[GRUPO] Iniciando verificação diária de assinaturas...");

    // Obter todos os membros do grupo
    const members = await bot.telegram.getChatAdministrators(GROUP_ID);

    for (const member of members) {
      try {
        const user = member.user;

        // Ignora bots e administradores
        if (
          user.is_bot ||
          ["creator", "administrator"].includes(member.status)
        ) {
          continue;
        }

        // Verifica assinatura
        const isSubscribed = await hasActiveSubscription(user.id);

        if (!isSubscribed) {
          console.log(`[GRUPO] Removendo usuário sem assinatura: ${user.id}`);
          await bot.telegram.banChatMember(GROUP_ID, user.id);
          await bot.telegram.unbanChatMember(GROUP_ID, user.id); // Permite reentrada se assinar depois
        }
      } catch (error) {
        console.error(
          `[GRUPO] Erro ao verificar usuário ${member.user.id}:`,
          error
        );
      }
    }

    console.log("[GRUPO] Verificação diária concluída.");
  } catch (error) {
    console.error("[GRUPO] Erro na verificação periódica:", error);
  }
}

// Handler para quando usuários tentam entrar no grupo
async function handleChatJoinRequest(ctx) {
  try {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    // Verifica se é o grupo VIP
    if (String(chatId) !== String(GROUP_ID)) {
      return;
    }

    // Verifica assinatura
    const isSubscribed = await hasActiveSubscription(userId);

    if (isSubscribed) {
      // Aprova entrada
      await ctx.approveChatJoinRequest(userId);
      console.log(`[GRUPO] Acesso permitido para ${userId}`);
    } else {
      // Recusa entrada
      await ctx.declineChatJoinRequest(userId);
      console.log(`[GRUPO] Acesso negado para ${userId}`);
    }
  } catch (error) {
    console.error("[GRUPO] Erro ao processar pedido de entrada:", error);
  }
}

// Exporta como função de handler
module.exports = function groupHandler(bot) {
  // Configura o handler para solicitações de entrada no grupo
  bot.on("chat_join_request", handleChatJoinRequest);

  // Agenda verificação diária (24h)
  setInterval(() => cleanNonSubscribers(bot), 24 * 60 * 60 * 1000);

  // Primeira verificação 1 min após iniciar
  setTimeout(() => cleanNonSubscribers(bot), 60000);

  console.log("[GRUPO] Handler de grupo carregado com verificação diária");
};
