// src/services/industrialService.js
import { Utils } from '../js/utils.js';
import { ResultadoAnalise } from '../models/resultadoAnalise.js';
import { Logger } from '../js/logger.js';

/**
 * Matriz de Relacionamento de Negócio
 * Mapeamento exato entre "Carteira" e "Macro Setor" conforme sua regra de negócio.
 */
export const MATRIZ_ENQUADRAMENTO = [
    { carteira: "Alimentação Animal", macroSetor: "Alimentos e Bebidas" }, // Ajustado conforme lógica de setor
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
    { carteira: "Indústria de Defesa", macroSetor: "Metal Mecânico" },
    { carteira: "Indústria do Aço", macroSetor: "Metal Mecânico" },
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
    { carteira: "Saúde Animal", macroSetor: "Químicos" },
    { carteira: "Tabaco", macroSetor: "Diversos (Fumo)" },
    { carteira: "TIC", macroSetor: "TIC" },
    { carteira: "Velas e Sabão", macroSetor: "Químicos" },
    { carteira: "Vidro", macroSetor: "Minerais não Metálicos" }
];

// Base oficial restrita de Abrangência dos Sindicatos (Referência Interna Industrial)
const BaseAbrangenciaSindicatos = new Set([
    "0111301","0111302","0111303","0112101","0112102","0113000","0114800","0115600","0116401","0116402","0119999",
    "0500101","0500102","0600001","0600002","0710301","0710302","0721901","0721902","0729401","0729402","0729403",
    "0810001","0810002","0810003","0810099","0891600","0892401","0892402","0893200","0899199","0910601","0910602",
    "1011201","1011202","1011203","1011204","1011205","1012101","1012102","1012103","1013901","1013902","1020101",
    "1020102","1031700","1032501","1032599","1033301","1033302","1041401","1041402","1041403","1042200","1043100",
    "1051100","1052000","1053800","1061901","1061902","1062700","1063500","1064300","1065101","1065102","1066000",
    "1069400","1071600","1072401","1072402","1081301","1081302","1082100","1091101","1091102","1092900","1093701",
    "1093702","1094500","1095300","1096100","1099601","1099602","1099699","1111901","1111902","1112700","1113501",
    "1113502","1121600","1122401","1122402","1122499","1210600","1220401","1220402","1220403","1311100","1312000",
    "1313800","1314600","1321600","1322500","1323400","1330800","1340501","1340502","1340599","1351100","1359600",
    "1411801","1411802","1412601","1412602","1412603","1413401","1413402","1413403","1414200","1421500","1422300",
    "1510600","1521100","1529700","1610201","1610202","1621800","1622601","1622602","1623400","1629301","1629302",
    "1710901","1710902","1710903","1721400","1722200","1731100","1732000","1741901","1741902","1742799","1749400",
    "1811301","1811302","1812100","1813099","1821100","1822999","1910100","1921700","1922501","1922502","1922599",
    "1931400","1932200","2011100","2012600","2013401","2013402","2014200","2019399","2021500","2029100","2031200",
    "2032100","2033900","2040100","2051700","2052500","2061400","2062200","2063100","2091600","2092401","2092402",
    "2092403","2093200","2099199","2110600","2121101","2121102","2121103","2122000","2123800","2211100","2212900",
    "2219600","2221800","2222600","2223400","2229301","2229302","2229303","2229399","2311700","2312500","2319200",
    "2320600","2330301","2330302","2330303","2330399","2341900","2342701","2342702","2349401","2349499","2391501",
    "2391502","2391503","2392300","2399101","2399199","2411300","2421100","2422901","2422902","2423501","2423502",
    "2424000","2431800","2439300","2441501","2441502","2442300","2443100","2449101","2449102","2449103","2451200",
    "2452100","2511000","2512800","2513600","2521700","2522800","2531401","2531402","2532201","2532202","2539001",
    "2539002","2541100","2542000","2543800","2550101","2550102","2591800","2592601","2592602","2593400","2599301",
    "2599302","2599399","2610800","2621300","2622100","2631100","2632900","2640000","2651500","2652300","2660400",
    "2670101","2670102","2680900","2710401","2710402","2721000","2722801","2722802","2731700","2732500","2733300",
    "2740601","2740602","2751100","2759701","2759799","2790201","2790202","2790299","2811900","2812700","2813500",
    "2814301","2814302","2815101","2815102","2821601","2821602","2822401","2822402","2823200","2824101","2824102",
    "2825901","2825902","2829101","2829199","2831300","2832100","2833000","2840200","2851800","2852600","2861500",
    "2862300","2863100","2864000","2865800","2866900","2869100","2910701","2910702","2910703","2920401","2920402",
    "2930101","2930102","2930103","2949200","2950600","3011301","3011302","3012100","3031800","3032600","3041500",
    "3050400","3091101","3091102","3092000","3099700","3101201","3101202","3102100","3103900","3104700","3109000",
    "3211601","3211602","3212400","3220500","3230200","3240001","3240002","3240003","3240099","3250701","3250702",
    "3250703","3250704","3250705","3250706","3250709","3291400","3292201","3292202","3299001","3299002","3299003",
    "3299004","3299005","3299099","3311200","3312102","3312103","3312104","3313901","3313902","3313999","3314701",
    "3314702","3314709","3315500","3316301","3316302","3317101","3317102","3319801","3319802","3321000","3329501",
    "3329599"
]);

export const IndustrialService = {

    /**
     * Traduz a Carteira do banco para o Macro Setor oficial via Matriz.
     */
    traduzirPelaMatriz(carteiraBanco) {
        if (!carteiraBanco || carteiraBanco === "-") return { carteira: "-", macroSetor: "CNAE não industrial e não relacionado" };
        
        const match = MATRIZ_ENQUADRAMENTO.find(item => item.carteira.toLowerCase() === carteiraBanco.toLowerCase());
        
        return {
            carteira: carteiraBanco,
            macroSetor: match ? match.macroSetor : "Diversos (Outros)"
        };
    },

    /**
     * ANALISAR (Síncrono): Identificação Rápida baseada na lista estática.
     */
    analisar(empresa, analisarSecundarias = true) {
        let listaCompletaAnalise = [];

        const normPrincipal = Utils.normalizeCnae(empresa.cnaePrincipalCod);
        const isIndPrincipal = BaseAbrangenciaSindicatos.has(normPrincipal);

        listaCompletaAnalise.push({
            codigo: empresa.cnaePrincipalCod,
            codigoNormalizado: normPrincipal,
            descricao: empresa.cnaePrincipalDesc,
            tipo: "Principal",
            isIndustrial: isIndPrincipal
        });

        if (analisarSecundarias && Array.isArray(empresa.cnaesSecundarios)) {
            empresa.cnaesSecundarios.forEach(sec => {
                const normSec = Utils.normalizeCnae(sec.codigo);
                const isIndSec = BaseAbrangenciaSindicatos.has(normSec);
                listaCompletaAnalise.push({
                    codigo: sec.codigo,
                    codigoNormalizado: normSec,
                    descricao: sec.descricao,
                    tipo: "Secundária",
                    isIndustrial: isIndSec
                });
            });
        }

        const cnaesIndustriaisEncontradas = listaCompletaAnalise.filter(item => item.isIndustrial);
        const possuiIndustrial = cnaesIndustriaisEncontradas.length > 0;

        let motivacaoIndustrial = possuiIndustrial 
            ? cnaesIndustriaisEncontradas.map(i => i.codigo).join('\n') 
            : "Nenhuma das CNAEs está presente na base de abrangência.";

        return new ResultadoAnalise({
            perfil: possuiIndustrial ? "Indústria" : "Comércio / Serviços",
            macroSetor: possuiIndustrial ? "Indústria" : "Diversos / Outros",
            carteira: possuiIndustrial ? "Industrial" : "Diversos",
            possuiIndustrial,
            motivacaoIndustrial,
            cnaesIndustriaisLista: cnaesIndustriaisEncontradas.map(i => i.codigo),
            todasAnalisadas: listaCompletaAnalise
        });
    },

    /**
     * OBTER CLASSIFICAÇÃO AVANÇADA (Assíncrono): Cruza banco de dados com a Matriz de Setores.
     */
    async obterClassificacaoAvancada(empresa, analisarSecundarias = true, supabaseClient = null) {
        let listaCnaesParaValidar = [];

        listaCnaesParaValidar.push({
            codigo: empresa.cnaePrincipalCod,
            descricao: empresa.cnaePrincipalDesc || "-",
            tipo: "Principal"
        });

        if (analisarSecundarias && Array.isArray(empresa.cnaesSecundarios)) {
            empresa.cnaesSecundarios.forEach(sec => {
                listaCnaesParaValidar.push({
                    codigo: sec.codigo,
                    descricao: sec.descricao || "-",
                    tipo: "Secundária"
                });
            });
        }

        let analiseAvancada = {
            empresaIndustrial: "NÃO",
            totalCnaes: listaCnaesParaValidar.length,
            qtdIndustrial: 0,
            qtdNaoIndustrial: 0,
            carteiras: [],
            macroSetores: [],
            resultados: []
        };

        if (!supabaseClient) return analiseAvancada;

        try {
            const codigosParaBusca = [...new Set(listaCnaesParaValidar.map(c => Utils.normalizeCnae(c.codigo)))];
            const { data, error } = await supabaseClient
                .from('cnaes_classificacao')
                .select('codigo, industrial, carteira, macro_setor')
                .in('codigo', codigosParaBusca);

            if (error) throw error;

            const dbMap = new Map(data.map(item => [String(item.codigo), item]));
            const setCarteiras = new Set();
            const setMacroSetores = new Set();

            analiseAvancada.resultados = listaCnaesParaValidar.map(cnae => {
                const codLimpo = Utils.normalizeCnae(cnae.codigo);
                const matchDB = dbMap.get(codLimpo);
                
                // Critério: É industrial se estiver na lista estática OU se o banco disser SIM
                const isIndustrialPelaLista = BaseAbrangenciaSindicatos.has(codLimpo);
                const isIndustrialPeloBanco = matchDB && (matchDB.industrial === true || String(matchDB.industrial).toUpperCase() === 'SIM');
                const isIndustrialFinal = isIndustrialPelaLista || isIndustrialPeloBanco;

                // Tradução de Carteira e Macro Setor via Matriz
                const classificacao = this.traduzirPelaMatriz(matchDB ? matchDB.carteira : null);

                if (isIndustrialFinal) {
                    analiseAvancada.qtdIndustrial++;
                    analiseAvancada.empresaIndustrial = "SIM";
                    if (classificacao.carteira !== "-") setCarteiras.add(classificacao.carteira);
                    if (classificacao.macroSetor !== "-") setMacroSetores.add(classificacao.macroSetor);
                } else {
                    analiseAvancada.qtdNaoIndustrial++;
                }

                return {
                    codigo: cnae.codigo,
                    descricao: cnae.descricao,
                    principal: cnae.tipo === "Principal",
                    industrial: isIndustrialFinal ? "SIM" : "NÃO",
                    carteira: classificacao.carteira,
                    macroSetor: classificacao.macroSetor
                };
            });

            analiseAvancada.carteiras = Array.from(setCarteiras);
            analiseAvancada.macroSetores = Array.from(setMacroSetores);

        } catch (error) {
            Logger.error("Falha na consulta avançada via Supabase", error);
        }

        return analiseAvancada;
    }
};
