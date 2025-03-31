require('dotenv').config();
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuração do cliente
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: {
        timeout: 5000,
        sandbox: process.env.NODE_ENV !== 'production'
    }
});

const paymentClient = new Payment(client);

/**
 * Cria um pagamento PIX
 * @param {string} userId - ID do usuário
 * @param {string} planType - Tipo do plano (vip_1, vip_3, etc.)
 * @returns {Promise<{qr_code: string, pix_code: string, payment_id: string, expires_at: Date}>}
 */
async function createPixPayment(userId, planType) {
    const planConfig = {
        vip_1: { price: 19.90 },
        vip_3: { price: 29.90 },
        vip_6: { price: 39.90 },
        vip_life: { price: 49.90 }
    };

    const plan = planConfig[planType];
    if (!plan) throw new Error("Plano inválido");

    try {
        const payment = await paymentClient.create({
            body: {
                transaction_amount: plan.price,
                payment_method_id: "pix",
                payer: {
                    email: process.env.MERCADOPAGO_EMAIL || `${userId}@tempuser.com`
                },
                description: `Assinatura ${planType.replace('_', ' ')}`
            }
        });

        return {
            qr_code: payment.point_of_interaction.transaction_data.qr_code,
            pix_code: payment.point_of_interaction.transaction_data.qr_code,
            payment_id: payment.id,
            expires_at: payment.date_of_expiration
        };
    } catch (error) {
        console.error("Erro ao criar PIX:", error);
        throw new Error(`Falha ao gerar PIX: ${error.message}`);
    }
}

/**
 * Verifica um pagamento
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<string>} - Status do pagamento
 */
async function verifyPayment(paymentId) {
    try {
        const payment = await paymentClient.get({ id: paymentId });
        return payment.status;
    } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
        throw new Error(`Falha ao verificar pagamento: ${error.message}`);
    }
}

module.exports = {
    createPixPayment,
    verifyPayment
};