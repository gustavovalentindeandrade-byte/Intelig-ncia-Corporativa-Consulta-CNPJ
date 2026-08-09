export const Logger = {
    logConsulta({ cnpj, url, provider, responseTimeMs, status, requestBody, responseBody, error, stack, fallbackUsed, totalTimeMs, finalResult }) {
        console.group(`[LOG PROFISSIONAL] Consulta CNPJ: ${cnpj}`);
        console.log(`Data/Hora: ${new Date().toISOString()}`);
        console.log(`Provedor Utilizado: ${provider}`);
        console.log(`URL Requisitada: ${url || 'N/A'}`);
        console.log(`Tempo de Resposta Provedor: ${responseTimeMs}ms`);
        console.log(`Tempo Total da Operação: ${totalTimeMs}ms`);
        console.log(`Status HTTP: ${status || 'N/A'}`);
        if (requestBody) console.log('Body Enviado:', requestBody);
        if (responseBody) console.log('Body Recebido:', responseBody);
        if (error) {
            console.error('Erro Capturado:', error);
            if (stack) console.error('Stack Trace:', stack);
        }
        console.log(`Fallback Utilizado: ${fallbackUsed ? 'Sim' : 'Não'}`);
        console.log(`Resultado Final:`, finalResult);
        console.groupEnd();
    },

    error(message, err) {
        console.error(`[LOGGER ERROR] ${message}`, err);
    },

    warn(message) {
        console.warn(`[LOGGER WARN] ${message}`);
    }
};
