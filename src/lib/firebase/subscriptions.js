const { admin, getCollection } = require("./client");
const subscriptionsCol = getCollection("subscriptions");
const usersCol = getCollection("users");

module.exports = {
  async getActiveSubscriptions(userId) {
    const snapshot = await subscriptionsCol
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .where("expiresAt", ">", admin.firestore.Timestamp.now())
      .get();

    return snapshot.docs.map((doc) => doc.data());
  },

  async hasActiveSubscription(userId) {
    const activeSubs = await module.exports.getActiveSubscriptions(userId);
    return activeSubs.length > 0;
  },

  async updatePaymentStatus(paymentId, newStatus) {
    const paymentsCol = getCollection("payments");

    console.log(`Buscando pagamento com ID: ${paymentId}`);

    // Primeiro tenta encontrar pelo ID do documento
    const docRef = paymentsCol.doc(paymentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Se não encontrar, faz busca alternativa
      console.log(`Pagamento não encontrado pelo ID direto, tentando busca...`);
      const query = await paymentsCol
        .where("searchId", "==", paymentId.toLowerCase())
        .limit(1)
        .get();

      if (query.empty) {
        console.error(`Pagamento ${paymentId} não encontrado de nenhuma forma`);
        throw new Error(`Pagamento ${paymentId} não encontrado`);
      }

      console.log(`Pagamento encontrado via busca alternativa`);
      const foundId = query.docs[0].id;
      await paymentsCol.doc(foundId).update({
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    }

    console.log(`Pagamento encontrado diretamente pelo ID`);
    await docRef.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  },

  async createSubscription(userId, planData, subscriptionId) {
    const subscriptionData = {
      userId,
      ...planData,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: calculateExpiration(planData.type),
    };

    // Cria a assinatura usando um ID específico (se fornecido)
    await subscriptionsCol.doc(subscriptionId).set(subscriptionData);

    // Atualiza o status do usuário
    await usersCol.doc(String(userId)).set(
      {
        hasActiveSubscription: true,
        lastSubscriptionUpdate: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return subscriptionData;
  },

  createSubscriptionFromPayment: async (paymentId) => {
    const paymentsCol = getCollection("payments");
    const paymentDoc = await paymentsCol
      .where("paymentId", "==", paymentId)
      .get();

    if (paymentDoc.empty) {
      throw new Error("Pagamento não encontrado");
    }

    const paymentData = paymentDoc.docs[0].data();

    // Mapeia os tipos de plano do Mercado Pago para os do seu sistema
    const planTypeMap = {
      vip_1: "1_month",
      vip_3: "3_months",
      vip_6: "6_months",
      vip_life: "lifetime",
    };

    return await module.exports.createSubscription(
      paymentData.userId,
      {
        type: planTypeMap[paymentData.planType],
        paymentId: paymentId,
        amount: paymentData.amount,
      },
      paymentId
    );
  },
};

function calculateExpiration(planType) {
  const now = new Date();
  switch (planType) {
    case "1_month":
      return new Date(now.setMonth(now.getMonth() + 1));
    case "3_months":
      return new Date(now.setMonth(now.getMonth() + 3));
    case "6_months":
      return new Date(now.setMonth(now.getMonth() + 6));
    case "lifetime":
      return new Date(8640000000000000);
    default:
      throw new Error("Tipo de plano inválido");
  }
}

async function cleanupExpiredSubscriptions() {
  const batch = admin.firestore().batch();
  const expired = await subscriptionsCol
    .where("expiresAt", "<", admin.firestore.Timestamp.now())
    .where("status", "==", "active")
    .get();

  expired.forEach((doc) => {
    batch.update(doc.ref, { status: "expired" });
    batch.update(usersCol.doc(String(doc.data().userId)), {
      hasActiveSubscription: false,
    });
  });

  await batch.commit();
}

// Adicione esta função ao seu subscriptions.js
async function checkGroupMembers(bot, groupId) {
  try {
    const members = await bot.telegram.getChatAdministrators(groupId);
    const memberIds = members.map((m) => m.user.id);

    const nonSubscribers = [];

    for (const userId of memberIds) {
      const user = await bot.telegram.getChatMember(groupId, userId);

      if (
        user.user.is_bot ||
        ["creator", "administrator"].includes(user.status)
      ) {
        continue;
      }

      const isSubscribed = await this.hasActiveSubscription(userId);
      if (!isSubscribed) {
        nonSubscribers.push(userId);
      }
    }

    return nonSubscribers;
  } catch (error) {
    console.error("Erro ao verificar membros do grupo:", error);
    return [];
  }
}

// Adicione ao module.exports:
module.exports.checkGroupMembers = checkGroupMembers;

// Executa a cada 24h
setInterval(cleanupExpiredSubscriptions, 24 * 60 * 60 * 1000);
