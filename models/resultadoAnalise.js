export class ResultadoAnalise {
    constructor({ 
        perfil, 
        macroSetor, 
        carteira, 
        possuiIndustrial, 
        motivacaoIndustrial, 
        cnaesIndustriaisLista, 
        todasAnalisadas,
        // NOVO: Parâmetro opcional para armazenar os dados do banco
        analiseAvancada 
    }) {
        // Campos originais preservados
        this.perfil = perfil;
        this.macroSetor = macroSetor;
        this.carteira = carteira;
        this.possuiIndustrial = possuiIndustrial;
        this.motivacaoIndustrial = motivacaoIndustrial;
        this.cnaesIndustriaisLista = cnaesIndustriaisLista;
        this.todasAnalisadas = todasAnalisadas;
        
        // NOVO: Encapsula a classificação detalhada de Carteiras e Macro Setores
        // O fallback garante retrocompatibilidade com históricos antigos salvos.
        this.analiseAvancada = analiseAvancada || {
            empresaIndustrial: "NÃO",
            totalCnaes: todasAnalisadas ? todasAnalisadas.length : 0,
            qtdIndustrial: 0,
            qtdNaoIndustrial: 0,
            carteiras: [],
            macroSetores: [],
            resultados: []
        };
    }
}
