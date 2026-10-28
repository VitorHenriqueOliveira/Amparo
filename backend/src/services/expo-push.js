export function criarClienteExpo({ accessToken = process.env.EXPO_ACCESS_TOKEN, fetchImpl = fetch } = {}) {
    async function solicitar(caminho, body) {
        const resposta = await fetchImpl('https://exp.host/--/api/v2/push/' + caminho, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json',
                ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });

        if (!resposta.ok) {
            // Somente 429 confirma que a solicitação não foi aceita e pode ser repetida.
            throw Object.assign(new Error('Serviço de notificações indisponível.'), { repetivel: resposta.status === 429 });
        }

        const dados = await resposta.json();

        if (dados.errors?.length || !dados.data) throw new Error('Resposta inválida do serviço de notificações.');

        return dados.data;
    }

    return {
        async enviar(token) {
            const ticket = await solicitar('send', {
                to: token, title: 'Amparo', body: 'Reserve um momento para cuidar de você.',
                sound: 'default', ttl: 900,
            });

            if (!['ok', 'error'].includes(ticket.status) || (ticket.status === 'ok' &&
                (typeof ticket.id !== 'string' || !ticket.id.length || ticket.id.length > 200))) {
                throw new Error('Confirmação de envio inválida.');
            }

            return ticket;
        },
        recibos(ids) { return solicitar('getReceipts', { ids }); },
    };
}
