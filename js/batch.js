import { CONFIG } from '../config/config.js';
import { Utils } from './utils.js';
import { CnpjService } from '../services/cnpjService.js';
import { IndustrialService } from '../services/industrialService.js';
import { HistoryRepository } from '../storage/historyRepository.js';

export const BatchService = {
    async processarLote(rawText, supabaseClient, analisarSecundarias, onProgress, onRowComplete, onComplete) {
        let cnpjs = [...new Set(rawText.split(/[\n,;]+/).map(Utils.cleanCNPJ).filter(c => c.length > 0))];
        if (cnpjs.length === 0) {
            alert('Insira pelo menos um CNPJ válido para o lote.');
            return;
        }

        let batchResultsData = [];
        let index = 0;

        // Fila com limite de concorrência (CONFIG.BATCH_CONCURRENCY_LIMIT = 5)
        const executarProximo = async () => {
            if (index >= cnpjs.length) return;
            const currentIndex = index++;
            const raw = cnpjs[currentIndex];
            const formatted = Utils.formatCNPJ(raw);

            onProgress(currentIndex + 1, cnpjs.length);

            if (!Utils.isValidCNPJ(raw)) {
                onRowComplete(formatted, null, null, 'Inválido', 'CNPJ Inválido Estruturalmente');
            } else {
                try {
                    const empresa = await CnpjService.consultar(raw);
                    
                    // 1. Chamada legada (síncrona) mantida
                    const analise = IndustrialService.analisar(empresa, analisarSecundarias);
                    
                    // 2. NOVA CHAMADA: Busca os dados no Supabase para o lote
                    const analiseAvancada = await IndustrialService.obterClassificacaoAvancada(empresa, analisarSecundarias, supabaseClient);
                    analise.analiseAvancada = analiseAvancada;

                    const listaCnaesStr = analise.cnaesIndustriaisLista.length > 0 ? analise.cnaesIndustriaisLista.join(", ") : "-";

                    // 3. Objeto enriquecido para o Excel (Novas colunas adicionadas ao final)
                    batchResultsData.push({
                        CNPJ: formatted,
                        Razao_Social: empresa.razaoSocial,
                        Porte: empresa.porte,
                        Perfil: analise.perfil,
                        Municipio_UF: `${empresa.municipio}/${empresa.uf}`,
                        Possui_CNAE_Industrial: analise.possuiIndustrial ? "Sim" : "Não",
                        CNAEs_Industriais_Encontradas: listaCnaesStr,
                        // Novas Colunas
                        Empresa_Industrial: analiseAvancada.empresaIndustrial,
                        Qtd_CNAEs: analiseAvancada.totalCnaes,
                        Carteiras: analiseAvancada.carteiras.length > 0 ? analiseAvancada.carteiras.join(', ') : "-",
                        Macro_Setores: analiseAvancada.macroSetores.length > 0 ? analiseAvancada.macroSetores.join(', ') : "-"
                    });

                    // O histórico agora salvará o objeto `analise` completo, com a aba analiseAvancada acoplada.
                    // Erro ao salvar histórico não deve impedir a linha de aparecer como sucesso no lote.
                    try {
                        await HistoryRepository.salvar(supabaseClient, empresa, analise);
                    } catch (histErr) {
                        console.error('Erro ao salvar histórico do item de lote:', histErr);
                    }
                    onRowComplete(formatted, empresa, analise, 'Sucesso', null);
                } catch (err) {
                    onRowComplete(formatted, null, null, 'Erro', err.message);
                }
            }

            if (index < cnpjs.length) {
                return executarProximo();
            }
        };

        const workers = Array.from({ length: Math.min(CONFIG.BATCH_CONCURRENCY_LIMIT, cnpjs.length) }, () => executarProximo());
        await Promise.all(workers);

        onComplete(batchResultsData);
    }
};
