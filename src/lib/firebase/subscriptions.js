const { admin, getCollection } = require('./client');
const subscriptionsCol = getCollection('subscriptions');
const usersCol = getCollection('users');

module.exports = {
    async createSubscription(userId, planData) {
        const subscriptionData = {
            userId,
            ...planData,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: calculateExpiration(planData.type)
        };

        // Cria a assinatura
        await subscriptionsCol.add(subscriptionData);

        // Atualiza o status do usuário
        await usersCol.doc(String(userId)).set({
            hasActiveSubscription: true,
            lastSubscriptionUpdate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return subscriptionData;
    },

    async getActiveSubscriptions(userId) {
        const snapshot = await subscriptionsCol
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .where('expiresAt', '>', admin.firestore.Timestamp.now())
            .get();

        return snapshot.docs.map(doc => doc.data());
    },

    async hasActiveSubscription(userId) {
        const activeSubs = await this.getActiveSubscriptions(userId);
        return activeSubs.length > 0;
    }
};

function calculateExpiration(planType) {
    const now = new Date();
    switch (planType) {
        case '1_month':
            return new Date(now.setMonth(now.getMonth() + 1));
        case '3_months':
            return new Date(now.setMonth(now.getMonth() + 3));
        case '6_months':
            return new Date(now.setMonth(now.getMonth() + 6));
        case 'lifetime':
            return new Date(8640000000000000);
        default:
            throw new Error('Tipo de plano inválido');
    }
}

async function cleanupExpiredSubscriptions() {
    const batch = admin.firestore().batch();
    const expired = await subscriptionsCol
        .where('expiresAt', '<', admin.firestore.Timestamp.now())
        .where('status', '==', 'active')
        .get();

    expired.forEach(doc => {
        batch.update(doc.ref, { status: 'expired' });
        batch.update(usersCol.doc(String(doc.data().userId)), {
            hasActiveSubscription: false
        });
    });

    await batch.commit();
}

// Executa a cada 24h
setInterval(cleanupExpiredSubscriptions, 24 * 60 * 60 * 1000);