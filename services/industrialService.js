// src/services/industrialService.js
import { Utils } from '../js/utils.js';
import { ResultadoAnalise } from '../models/resultadoAnalise.js';

/**
 * Matriz de Relacionamento de Negócio (Tradução Local)
 */
export const MATRIZ_ENQUADRAMENTO = [
    { carteira: null, macroSetor: "CNAE não industrial e não relacionado" },
    { carteira: null, macroSetor: "P&D" },
    { carteira: null, macroSetor: "Diversos (Outros)" },
    { carteira: null, macroSetor: "Diversos (Serviços Complementares)" },
    { carteira: "Alimentação Animal", macroSetor: null },
    { carteira: "Alimentos e Bebidas", macroSetor: "Alimentos e Bebidas" },
    { carteira: "Artefatos de Papel", macroSetor: "Papel e Papelão" },
    { carteira: "Audiovisual", macroSetor: "Audiovisual" },
    { carteira: "Automotivo", macroSetor: "Indústria de Transportes" },
    { carteira: "Borracha", macroSetor: "Borracha e Plástico (Borracha)" },
    { carteira: "Cadeia da Moda", macroSetor: "Moda" },
    { carteira: "Construção Civil", macroSetor: "Construção Pesada e Civil" },
    { carteira: "Construção Naval", macroSetor: "Naval" },
    { carteira: "Cosmético", macroSetor: "Químicos" },
    { carteira: "Editorial | Gráfico", macroSetor: "Editorial e Gráfica" },
    { carteira: "Energia", macroSetor: "SIUP" },
    { carteira: "Extrativista", macroSetor: "Extrativista" },
    { carteira: "Farmacêutico", macroSetor: "Químicos" },
    { carteira: "Fósforo", macroSetor: "Químicos" },
    { carteira: "Indústria de Defesa", macroSetor: null },
    { carteira: "Indústria do Aço", macroSetor: null },
    { carteira: "Lavanderia", macroSetor: "Químicos" },
    { carteira: "Madeira e Mobiliário", macroSetor: "Madeira e Mobiliário" },
    { carteira: "Metal Mecânico", macroSetor: "Metal Mecânico" },
    { carteira: "Panificação", macroSetor: "Alimentos e Bebidas" },
    { carteira: "Papel", macroSetor: "Papel e Papelão" },
    { carteira: "Plástico", macroSetor: "Borracha e Plástico (Plástico)" },
    { carteira: "Químico", macroSetor: "Químicos" },
    { carteira: "Refratário", macroSetor: "Minerais não Metálicos" },
    { carteira: "Refrigeração de Ar", macroSetor: "SIUP" },
    { carteira: "Reparação", macroSetor: "Indústria de Transportes" },
    { carteira: "Saúde Animal", macroSetor: null },
    { carteira: "Tabaco", macroSetor: "Diversos (Fumo)" },
    { carteira: "TIC", macroSetor: "TIC" },
    { carteira: "Velas e Sabão", macroSetor: "Químicos" },
    { carteira: "Vidro", macroSetor: null }
];

// Conjunto de códigos para análise rápida (Base Abrangência Sindicatos)
const BaseAbrangenciaSindicatos = new Set([
    "1011201","1011202","1011203", "3329599" // ... (Mantenha sua lista completa aqui)
]);

export const IndustrialService = {

    /**
     * Identifica o Macro Setor baseado na Carteira usando a matriz local.
     */
    classificar(carteiraBusca) {
        if (!carteiraBusca || carteiraBusca === "-") return { carteira: "-", macroSetor: "-" };
        
        const match = MATRIZ_ENQUADRAMENTO.find(item => item.carteira === carteiraBusca);
        
        return {
            carteira: carteiraBusca,
            macroSetor: (match && match.macroSetor) ? match.macroSetor : "-"
        };
    },

    /**
     * Mantém a lógica de análise síncrona original para retrocompatibilidade
     */
    analisar(empresa, analisarSecundarias = true) {
        const normPrincipal = Utils.normalizeCnae(empresa.cnaePrincipalCod);
        const isIndPrincipal = BaseAbrangenciaSindicatos.has(normPrincipal);
        
        let listaAnalisada = [{
            codigo: empresa.cnaePrincipalCod,
            descricao: empresa.cnaePrincipalDesc,
            tipo: "Principal",
            isIndustrial: isIndPrincipal
        }];

        if (analisarSecundarias && empresa.cnaesSecundarios) {
            empresa.cnaesSecundarios.forEach(sec => {
                listaAnalisada.push({
                    codigo: sec.codigo,
                    descricao: sec.descricao,
                    tipo: "Secundária",
                    isIndustrial: BaseAbrangenciaSindicatos.has(Utils.normalizeCnae(sec.codigo))
                });
            });
        }

        const possuiIndustrial = listaAnalisada.some(i => i.isIndustrial);

        return new ResultadoAnalise({
            perfil: possuiIndustrial ? "Indústria" : "Comércio / Serviços",
            macroSetor: possuiIndustrial ? "Indústria" : "Outros",
            carteira: possuiIndustrial ? "Industrial" : "Diversos",
            possuiIndustrial,
            motivacaoIndustrial: possuiIndustrial ? "CNAE Industrial identificado na base." : "Nenhum CNAE industrial detectado.",
            cnaesIndustriaisLista: listaAnalisada.filter(i => i.isIndustrial).map(i => i.codigo),
            todasAnalisadas: listaAnalisada
        });
    },

    /**
     * OTIMIZADO: Consulta o banco de dados uma única vez e aplica a matriz
     */
    async obterClassificacaoAvancada(empresa, analisarSecundarias, supabaseClient) {
        // 1. Coleta todos os códigos (usando as propriedades corretas do modelo Empresa)
        const listaCnaesOriginal = [
            { codigo: empresa.cnaePrincipalCod, descricao: empresa.cnaePrincipalDesc, principal: true }
        ];

        if (analisarSecundarias && empresa.cnaesSecundarios) {
            empresa.cnaesSecundarios.forEach(c => {
                listaCnaesOriginal.push({ codigo: c.codigo, descricao: c.descricao, principal: false });
            });
        }

        // 2. Normaliza códigos para consulta em lote (Bulk Query)
        const codigosLimpos = [...new Set(listaCnaesOriginal.map(c => Utils.normalizeCnae(c.codigo)))];
        
        let dbResultsMap = new Map();

        // 3. Consulta Única ao Supabase (Muito mais rápido que um loop de .single())
        if (supabaseClient && codigosLimpos.length > 0) {
            try {
                const { data, error } = await supabaseClient
                    .from('cnaes_classificacao') // Nome correto da tabela conforme seu main.js
                    .select('codigo, carteira, industrial, macro_setor')
                    .in('codigo', codigosLimpos);

                if (data) {
                    data.forEach(row => dbResultsMap.set(String(row.codigo), row));
                }
            } catch (err) {
                console.error("Erro na busca avançada:", err);
            }
        }

        // 4. Processamento dos resultados cruzando com a MATRIZ
        let qtdIndustrial = 0;
        let carteirasEncontradas = new Set();
        let macroSetoresEncontrados = new Set();

        const resultadosTabela = listaCnaesOriginal.map(item => {
            const codLimpo = Utils.normalizeCnae(item.codigo);
            const dbInfo = dbResultsMap.get(codLimpo);
            
            // Verifica se é industrial pelo banco
            const isIndustrial = dbInfo && (dbInfo.industrial === true || String(dbInfo.industrial).toUpperCase() === 'SIM');
            
            // Aplica Matriz de Tradução baseada na carteira vinda do banco
            const carteiraOriginal = dbInfo ? dbInfo.carteira : "-";
            const cl = this.classificar(carteiraOriginal);

            // Se o banco já trouxer o Macro Setor, podemos usá-lo como fallback se a matriz local não tiver
            const macroFinal = (cl.macroSetor !== "-") ? cl.macroSetor : (dbInfo?.macro_setor || "-");

            if (isIndustrial) {
                qtdIndustrial++;
                if (cl.carteira !== "-") carteirasEncontradas.add(cl.carteira);
                if (macroFinal !== "-") macroSetoresEncontrados.add(macroFinal);
            }

            return {
                codigo: item.codigo,
                descricao: item.descricao,
                principal: item.principal,
                industrial: isIndustrial ? "SIM" : "NÃO",
                carteira: cl.carteira,
                macroSetor: macroFinal
            };
        });

        return {
            empresaIndustrial: qtdIndustrial > 0 ? "SIM" : "NÃO",
            totalCnaes: listaCnaesOriginal.length,
            qtdIndustrial: qtdIndustrial,
            qtdNaoIndustrial: listaCnaesOriginal.length - qtdIndustrial,
            carteiras: Array.from(carteirasEncontradas),
            macroSetores: Array.from(macroSetoresEncontrados),
            resultados: resultadosTabela
        };
    }
};
