import { Utils } from '../js/utils.js';

export const HistoryRepository = {
    async salvar(supabaseClient, empresa, analise) {
        if (!supabaseClient) return;
        try {
            await supabaseClient.from('consultas_historico').upsert({
                cnpj: Utils.cleanCNPJ(empresa.cnpj),
                razao_social: empresa.razaoSocial,
                porte: empresa.porte || 'N/A',
                perfil: analise.perfil,
                macro_setor: analise.macroSetor,
                carteira: analise.carteira,
                possui_industrial: analise.possuiIndustrial ? "Sim" : "Não",
                motivo_industrial: analise.motivacaoIndustrial || ""
            }, { onConflict: 'cnpj' });
        } catch (err) {
            console.error("Erro ao persistir histórico no Supabase:", err);
        }
    },

    async carregar(supabaseClient, limit = 8) {
        if (!supabaseClient) return [];
        try {
            const { data, error } = await supabaseClient
                .from('consultas_historico')
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