import { MercadoPagoConfig, Preference } from 'mercadopago';

// Passo 1: Configurar o cliente com o access token
const client = new MercadoPagoConfig({
    accessToken: 'APP_USR-5231868676040362-032423-cfc4be36b6b5983db6f576391be901a1-2352393830',
    options: { timeout: 5000 }
});

// Passo 2: Criar a preferência de pagamento (onde o método Pix será gerado)
const preference = new Preference(client);

// Passo 3: Criar o corpo da requisição para gerar o código Pix
const body = {
    items: [
        {
            title: 'Pagamento via Pix',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 100.00 // Valor que você deseja cobrar (em reais)
        }
    ],
    payer_email: 'payer@example.com', // E-mail do pagador, pode ser omitido se não necessário
    payment_methods: {
        excluded_payment_methods: [{ id: 'visa' }, { id: 'master' }],
        excluded_payment_types: [{ id: 'ticket' }]
    },
};

// Passo 4: Criar a preferência
preference.create({ body }).then(response => {
    // Exibindo a resposta completa da API
    console.log('Resposta completa da API:', response);

    // Verificar e acessar corretamente a chave init_point
    if (response && response.body && response.body.init_point) {
        const pixCodeUrl = response.body.init_point;
        console.log(`Código Pix gerado: ${pixCodeUrl}`);
    } else {
        console.error('Não foi possível gerar o código Pix. Detalhes da resposta:', response.body);
    }
}).catch(error => {
    console.error('Erro ao gerar o código Pix:', error.response ? error.response.body : error.message);
});
