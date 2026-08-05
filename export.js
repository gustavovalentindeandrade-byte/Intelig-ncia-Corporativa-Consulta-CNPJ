import { Utils } from './utils.js';

export const ExportService = {
    copiar(empresa) {
        if (!empresa) return;
        const texto = `CNPJ: ${Utils.formatCNPJ(empresa.cnpj)}\nRazão Social: ${empresa.razaoSocial}\nMunicípio/UF: ${empresa.municipio}/${empresa.uf}\nAtividade Principal: ${empresa.cnaePrincipalCod} - ${empresa.cnaePrincipalDesc}`;
        navigator.clipboard.writeText(texto).then(() => alert('Dados copiados para a área de transferência!'));
    },

    imprimir() {
        window.print();
    },

    pdf(empresa) {
        const element = document.getElementById('fichaEmpresa');
        if (!element || !window.html2pdf) return;
        const opt = {
            margin: 0.4,
            filename: `Ficha_Analise_${empresa.cnpj}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(element).save();
    },

    excelIndividual(empresa) {
        if (!empresa || !window.XLSX) return;
        const flatData = [{
            CNPJ: Utils.formatCNPJ(empresa.cnpj),
            Razao_Social: empresa.razaoSocial,
            Nome_Fantasia: empresa.nomeFantasia,
            Situacao: empresa.situacaoCadastral,
            Porte: empresa.porte,
            Municipio_UF: `${empresa.municipio}/${empresa.uf}`,
            CNAE_Principal: `${empresa.cnaePrincipalCod} - ${empresa.cnaePrincipalDesc}`
        }];
        const ws = window.XLSX.utils.json_to_sheet(flatData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Empresa");
        window.XLSX.writeFile(wb, `Dados_Empresa_${empresa.cnpj}.xlsx`);
    },

    excelLote(batchResultsData) {
        if (!batchResultsData || batchResultsData.length === 0 || !window.XLSX) return;
        const ws = window.XLSX.utils.json_to_sheet(batchResultsData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Analise_Lote_Base");
        window.XLSX.writeFile(wb, `Relatorio_Lote_Classificacao_Industrial.xlsx`);
    }
};