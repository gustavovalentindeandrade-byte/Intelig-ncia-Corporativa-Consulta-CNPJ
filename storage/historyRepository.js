import { Utils } from '../js/utils.js';

export const HistoryRepository = {
    async salvar(supabaseClient, empresa, analise) {
        if (!supabaseClient) return;
        try {
            // 1. Monta o payload original garantindo a retrocompatibilidade
            const payload = {
                cnpj: Utils.cleanCNPJ(empresa.cnpj),
                razao_social: empresa.razaoSocial,
                porte: empresa.porte || 'N/A',
                perfil: analise.perfil,
                macro_setor: analise.macroSetor, // Legado preservado
                carteira: analise.carteira, // Legado preservado
                possui_industrial: analise.possuiIndustrial ? "Sim" : "Não",
                motivo_industrial: analise.motivacaoIndustrial || ""
            };

            // 2. Acopla os novos dados dinamicamente
            if (analise.analiseAvancada) {
                const adv = analise.analiseAvancada;
                payload.industrial_avancado = adv.empresaIndustrial;
                payload.total_cnaes = adv.totalCnaes;
                payload.carteiras_avancadas = adv.carteiras.length > 0 ? adv.carteiras.join(', ') : '-';
                payload.macro_setores_avancados = adv.macroSetores.length > 0 ? adv.macroSetores.join(', ') : '-';
            }

            // 3. Executa a persistência
            const { error } = await supabaseClient
                .from('consultas_historico')
                .upsert(payload, { onConflict: 'cnpj' });

            if (error) throw error;

        } catch (err) {
            console.error("Erro ao persistir histórico no Supabase:", err);
        }
    },

    async carregar(supabaseClient, limit = 8) {
        if (!supabaseClient) return [];
        try {
            const { data, error } = await supabaseClient
                .from('consultas_historico')
                // A query de seleção foi mantida intacta para não quebrar a UI
                .select('cnpj, razao_social')
                .order('criado_em', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Erro ao carregar histórico:", err);
            return [];
        }
    }
};
