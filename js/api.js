import { CONFIG } from '../config/config.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants.js';
import { Logger } from './logger.js';

export const ApiClient = {
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
        
        const startTime = performance.now();
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            const endTime = performance.now();
            return { response, responseTimeMs: Math.round(endTime - startTime) };
        } catch (error) {
            clearTimeout(id);
            const endTime = performance.now();
            if (error.name === 'AbortError') {
                const err = new Error(ERROR_MESSAGES.TIMEOUT);
                err.isTimeout = true;
                err.responseTimeMs = Math.round(endTime - startTime);
                throw err;
            }
            // Erros reais de rede/conectividade
            const netErr = new Error(ERROR_MESSAGES.NETWORK_ERROR);
            netErr.isNetworkError = true;
            netErr.originalError = error;
            netErr.responseTimeMs = Math.round(endTime - startTime);
            throw netErr;
        }
    },

    async fetchWithRetry(url, options = {}) {
        let attempt = 0;
        let lastError = null;

        while (attempt < CONFIG.MAX_RETRIES) {
            attempt++;
            try {
                const result = await this.fetchWithTimeout(url, options);
                const { response, responseTimeMs } = result;

                if (!response.ok) {
                    const status = response.status;
                    let errorBody = '';
                    try { errorBody = await response.text(); } catch(e) {}

                    const err = new Error(`HTTP Error ${status}`);
                    err.status = status;
                    err.responseBody = errorBody;
                    err.responseTimeMs = responseTimeMs;

                    // Erros temporários elegíveis a retry (5xx, 408, 429)
                    if (status >= 500 || status === HTTP_STATUS.REQUEST_TIMEOUT || status === HTTP_STATUS.TOO_MANY_REQUESTS) {
                        lastError = err;
                        if (attempt < CONFIG.MAX_RETRIES) {
                            const delay = CONFIG.RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
                            await new Promise(r => setTimeout(r, delay));
                            continue;
                        }
                    }
                    throw err;
                }

                return { response, responseTimeMs };
            } catch (error) {
                lastError = error;
                // Se for erro de rede real ou timeout, aplica retry se houver tentativas
                if ((error.isNetworkError || error.isTimeout) && attempt < CONFIG.MAX_RETRIES) {
                    const delay = CONFIG.RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    },

    parseHttpError(status, responseBody) {
        switch (status) {
            case HTTP_STATUS.BAD_REQUEST:
            case HTTP_STATUS.UNPROCESSABLE_ENTITY:
                return new Error(ERROR_MESSAGES.INVALID_CNPJ);
            case HTTP_STATUS.UNAUTHORIZED:
            case HTTP_STATUS.FORBIDDEN:
                return new Error(ERROR_MESSAGES.UNAUTHORIZED);
            case HTTP_STATUS.NOT_FOUND:
                return new Error(ERROR_MESSAGES.NOT_FOUND);
            case HTTP_STATUS.TOO_MANY_REQUESTS:
                return new Error(ERROR_MESSAGES.RATE_LIMIT);
            case HTTP_STATUS.REQUEST_TIMEOUT:
            case HTTP_STATUS.INTERNAL_SERVER_ERROR:
            case HTTP_STATUS.BAD_GATEWAY:
            case HTTP_STATUS.SERVICE_UNAVAILABLE:
            case HTTP_STATUS.GATEWAY_TIMEOUT:
                return new Error(ERROR_MESSAGES.SERVER_ERROR);
            default:
                return new Error(`Erro na API de consulta (HTTP ${status}).`);
        }
    }
};