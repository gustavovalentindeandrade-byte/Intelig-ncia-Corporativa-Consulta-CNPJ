import { CONFIG } from '../config/config.js';

export const CacheManager = {
    _getKey(cnpj) {
        return `cnpj_cache_${cnpj}`;
    },

    get(cnpj) {
        try {
            const raw = localStorage.getItem(this._getKey(cnpj));
            if (!raw) return null;
            const item = JSON.parse(raw);
            const now = Date.now();
            if (now - item.timestamp > CONFIG.CACHE_TTL_MS) {
                localStorage.removeItem(this._getKey(cnpj));
                return null;
            }
            return item.data;
        } catch (err) {
            console.error('Erro ao ler cache local:', err);
            return null;
        }
    },

    set(cnpj, data) {
        try {
            const item = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(this._getKey(cnpj), JSON.stringify(item));
        } catch (err) {
            console.error('Erro ao gravar cache local:', err);
        }
    }
};
