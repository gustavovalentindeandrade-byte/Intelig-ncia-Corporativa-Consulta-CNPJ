export const ERROR_MESSAGES = {
    NETWORK_ERROR: "Falha de conexão com a API de consulta. Verifique sua rede.",
    INVALID_CNPJ: "O CNPJ informado é inválido estruturalmente.",
    NOT_FOUND: "CNPJ não encontrado na base de dados da Receita Federal.",
    RATE_LIMIT: "Limite de requisições excedido. Aguarde alguns instantes.",
    UNAUTHORIZED: "Acesso negado ou restrito na API de consulta.",
    SERVER_ERROR: "Instabilidade temporária nos servidores de consulta.",
    TIMEOUT: "A requisição excedeu o tempo limite de espera (10 segundos)."
};

export const HTTP_STATUS = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};
