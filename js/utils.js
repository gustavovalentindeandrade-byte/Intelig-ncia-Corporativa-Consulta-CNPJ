export const Utils = {
    formatCNPJ(value) {
        if (!value) return '';
        return value.toString().replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substr(0, 18);
    },

    cleanCNPJ(value) {
        if (!value) return '';
        return value.toString().replace(/\D/g, '');
    },

    isValidCNPJ(cnpj) {
        cnpj = this.cleanCNPJ(cnpj);
        if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0, pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) { soma += numeros.charAt(tamanho - i) * pos--; if (pos < 2) pos = 9; }
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != digitos.charAt(0)) return false;
        tamanho = tamanho + 1; numeros = cnpj.substring(0, tamanho); soma = 0; pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) { soma += numeros.charAt(tamanho - i) * pos--; if (pos < 2) pos = 9; }
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != digitos.charAt(1)) return false;
        return true;
    },

    formatDate(dateString) {
        if (!dateString) return 'Não informada';
        const parts = dateString.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateString;
    },

    normalizeCnae(code) {
        if (!code) return '';
        return code.toString().replace(/\D/g, '');
    },

    // Evita XSS ao injetar em innerHTML dados vindos de APIs externas ou do Supabase
    // (razão social, descrições de CNAE, endereço etc. não são confiáveis por padrão).
    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};
