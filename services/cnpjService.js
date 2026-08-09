import { ApiClient } from '../js/api.js';
import { Utils } from '../js/utils.js';
import { CacheManager } from '../cache/cache.js';
import { Empresa } from '../models/empresa.js';
import { Logger } from '../js/logger.js';

export const CnpjService = {
    async consultar(cnpjInput) {
        const cnpjLimpo = Utils.cleanCNPJ(cnpjInput);
        if (!Utils.isValidCNPJ(cnpjLimpo)) {
            throw new Error("CNPJ inválido estruturalmente.");
        }

        // Verifica Cache Local
        const cachedData = CacheManager.get(cnpjLimpo);
        if (cachedData) {
            Logger.logConsulta({
                cnpj: cnpjLimpo,
                provider: 'Cache Local',
                responseTimeMs: 0,
                totalTimeMs: 0,
                finalResult: 'Sucesso (Cache)'
            });
            return new Empresa(cachedData, 'Cache Local');
        }

        const startTimeTotal = performance.now();
        let lastError = null;
        let fallbackUsed = false;

        // Cadeia de Provedores Automática (Fallback Chain)
        const providers = [
            { name: 'BrasilAPI', url: `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}` },
            { name: 'ReceitaWS', url: `https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}` },
            { name: 'CNPJ.ws', url: `https://publica.cnpj.ws/cnpj/${cnpjLimpo}` },
            { name: 'Brasil Aberto', url: `https://api.brasilaberto.com/v1/cnpj/${cnpjLimpo}` }
        ];

        for (const provider of providers) {
            try {
                const startTimeProvider = performance.now();
                const { response, responseTimeMs } = await ApiClient.fetchWithRetry(provider.url);
                const rawJson = await response.json();
                const endTimeProvider = performance.now();
                const totalTimeMs = Math.round(performance.now() - startTimeTotal);

                let normalizedData = this._normalizeProviderResponse(provider.name, rawJson);

                CacheManager.set(cnpjLimpo, normalizedData);

                Logger.logConsulta({
                    cnpj: cnpjLimpo,
                    url: provider.url,
                    provider: provider.name,
                    responseTimeMs,
                    status: response.status,
                    responseBody: rawJson,
                    fallbackUsed,
                    totalTimeMs,
                    finalResult: 'Sucesso'
                });

                return new Empresa(normalizedData, provider.name);
            } catch (err) {
                fallbackUsed = true;
                lastError = err;
                // Se for erro HTTP cliente específico (400, 404, etc), interrompe o fallback imediatamente
                if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
                    const parsedErr = ApiClient.parseHttpError(err.status, err.responseBody);
                    Logger.logConsulta({
                        cnpj: cnpjLimpo,
                        url: provider.url,
                        provider: provider.name,
                        responseTimeMs: err.responseTimeMs || 0,
                        status: err.status,
                        error: parsedErr,
                        fallbackUsed,
                        totalTimeMs: Math.round(performance.now() - startTimeTotal),
                        finalResult: 'Erro Cliente'
                    });
                    throw parsedErr;
                }
            }
        }

        // Se todos os provedores falharam por rede/timeout/servidor
        const finalTime = Math.round(performance.now() - startTimeTotal);
        Logger.error(`Falha em todos os provedores para o CNPJ ${cnpjLimpo}`, lastError);
        
        if (lastError && (lastError.isNetworkError || lastError.isTimeout)) {
            throw lastError; // Lança o erro real de rede
        }

        throw lastError || new Error("Não foi possível concluir a consulta em nenhum provedor disponível.");
    },

    _normalizeProviderResponse(providerName, raw) {
        if (providerName === 'ReceitaWS') {
            return {
                cnpj: raw.cnpj,
                razao_social: raw.nome,
                nome_fantasia: raw.fantasia,
                descricao_situacao_cadastral: raw.situacao,
                data_inicio_atividade: raw.abertura,
                porte: raw.porte,
                natureza_juridica: raw.natureza_juridica,
                logradouro: raw.logradouro,
                numero: raw.numero,
                complemento: raw.complemento,
                bairro: raw.bairro,
                municipio: raw.municipio,
                uf: raw.uf,
                cep: raw.cep,
                telefone: raw.telefone,
                email: raw.email,
                cnae_fiscal: raw.atividade_principal?.[0]?.code,
                cnae_fiscal_descricao: raw.atividade_principal?.[0]?.text,
                cnaes_secundarios: raw.atividades_secundarias
            };
        }
        if (providerName === 'CNPJ.ws') {
            return {
                cnpj: raw.estabelecimento?.cnpj,
                razao_social: raw.razao_social,
                nome_fantasia: raw.estabelecimento?.nome_fantasia,
                descricao_situacao_cadastral: raw.estabelecimento?.situacao_cadastral,
                data_inicio_atividade: raw.estabelecimento?.inicio_atividade,
                porte: raw.porte?.descricao,
                natureza_juridica: raw.natureza_juridica?.descricao,
                logradouro: raw.estabelecimento?.logradouro,
                numero: raw.estabelecimento?.numero,
                complemento: raw.estabelecimento?.complemento,
                bairro: raw.estabelecimento?.bairro,
                municipio: raw.estabelecimento?.cidade?.nome,
                uf: raw.estabelecimento?.estado?.sigla,
                cep: raw.estabelecimento?.cep,
                telefone: `${raw.estabelecimento?.ddd1 || ''}${raw.estabelecimento?.telefone1 || ''}`,
                email: raw.estabelecimento?.email,
                cnae_fiscal: raw.estabelecimento?.atividade_principal?.id,
                cnae_fiscal_descricao: raw.estabelecimento?.atividade_principal?.descricao,
                cnaes_secundarios: raw.estabelecimento?.atividades_secundarias?.map(a => ({ codigo: a.id, descricao: a.descricao }))
            };
        }
        // Padrão BrasilAPI / Brasil Aberto
        return raw;
    }
};
