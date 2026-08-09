export class Empresa {
    constructor(rawData, providerName) {
        this.cnpj = rawData.cnpj || '';
        this.razaoSocial = rawData.razao_social || rawData.razaoSocial || '';
        this.nomeFantasia = rawData.nome_fantasia || rawData.nomeFantasia || 'Não informado';
        this.situacaoCadastral = rawData.descricao_situacao_cadastral || rawData.situacao || '-';
        this.dataAbertura = rawData.data_inicio_atividade || rawData.dataAbertura || '';
        this.porte = rawData.porte || 'Não informado';
        this.naturezaJuridica = rawData.natureza_juridica || rawData.naturezaJuridica || '-';
        this.logradouro = rawData.logradouro || '';
        this.numero = rawData.numero || '';
        this.complemento = rawData.complemento || '';
        this.bairro = rawData.bairro || '';
        this.municipio = rawData.municipio || rawData.cidade || '';
        this.uf = rawData.uf || '';
        this.cep = rawData.cep || '';
        this.telefone = rawData.telefone || '';
        this.email = rawData.email || '';
        this.cnaePrincipalCod = rawData.cnae_fiscal || rawData.cnaePrincipal?.codigo || '';
        this.cnaePrincipalDesc = rawData.cnae_fiscal_descricao || rawData.cnaePrincipal?.descricao || '';
        this.cnaesSecundarios = this._normalizeCnaesSecundarias(rawData.cnaes_secundarios || rawData.cnaesSecundarias || []);
        this.provider = providerName;
    }

    _normalizeCnaesSecundarias(cnaes) {
        if (!Array.isArray(cnaes)) return [];
        return cnaes.map(c => ({
            codigo: c.codigo || c.code || '',
            descricao: c.descricao || c.text || ''
        }));
    }
}
