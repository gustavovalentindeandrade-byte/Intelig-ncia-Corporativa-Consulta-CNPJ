import { Utils } from './utils.js';

export const ExportService = {
    // Adicionado parâmetro opcional 'analise' para capturar Carteiras e Macro Setores
    copiar(empresa, analise = null) {
        if (!empresa) return;
        
        let texto = `CNPJ: ${Utils.formatCNPJ(empresa.cnpj)}\nRazão Social: ${empresa.razaoSocial}\nMunicípio/UF: ${empresa.municipio}/${empresa.uf}\nAtividade Principal: ${empresa.cnaePrincipalCod} - ${empresa.cnaePrincipalDesc}`;
        
        // Se a análise avançada foi injetada, anexa ao final da cópia
        if (analise && analise.analiseAvancada) {
            const adv = analise.analiseAvancada;
            texto += `\nEmpresa Industrial: ${adv.empresaIndustrial}`;
            texto += `\nTotal de CNAEs: ${adv.totalCnaes}`;
            texto += `\nCarteiras: ${adv.carteiras.length > 0 ? adv.carteiras.join(', ') : '-'}`;
            texto += `\nMacro Setores: ${adv.macroSetores.length > 0 ? adv.macroSetores.join(', ') : '-'}`;
        }

        navigator.clipboard.writeText(texto)
            .then(() => alert('Dados copiados para a área de transferência!'))
            .catch(() => alert('Não foi possível copiar automaticamente. Verifique as permissões do navegador.'));
    },

    imprimir() {
        window.print();
    },

    pdf(empresa) {
        // Ajuste inteligente: se 'fichaEmpresa' não englobar o novo card, 
        // ele tenta pegar o 'resultContainer' completo para o PDF sair perfeito.
        const element = document.getElementById('fichaEmpresa') || document.getElementById('resultContainer');
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

    excelIndividual(empresa, analise = null) {
        if (!empresa || !window.XLSX) return;
        
        // Mantém as colunas originais rigorosamente iguais
        const rowData = {
            CNPJ: Utils.formatCNPJ(empresa.cnpj),
            Razao_Social: empresa.razaoSocial,
            Nome_Fantasia: empresa.nomeFantasia,
            Situacao: empresa.situacaoCadastral,
            Porte: empresa.porte,
            Municipio_UF: `${empresa.municipio}/${empresa.uf}`,
            CNAE_Principal: `${empresa.cnaePrincipalCod} - ${empresa.cnaePrincipalDesc}`
        };

        // Adiciona novas colunas dinamicamente se a análise existir
        if (analise && analise.analiseAvancada) {
            const adv = analise.analiseAvancada;
            rowData['Empresa_Industrial'] = adv.empresaIndustrial;
            rowData['Qtd_CNAEs'] = adv.totalCnaes;
            rowData['Carteiras'] = adv.carteiras.length > 0 ? adv.carteiras.join(', ') : '-';
            rowData['Macro_Setores'] = adv.macroSetores.length > 0 ? adv.macroSetores.join(', ') : '-';
        }

        const flatData = [rowData];
        const ws = window.XLSX.utils.json_to_sheet(flatData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Empresa");
        window.XLSX.writeFile(wb, `Dados_Empresa_${empresa.cnpj}.xlsx`);
    },

    // A exportação em lote só lê o objeto montado no main.js, então não precisa de refatoração aqui.
    excelLote(batchResultsData) {
        if (!batchResultsData || batchResultsData.length === 0 || !window.XLSX) return;
        const ws = window.XLSX.utils.json_to_sheet(batchResultsData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Analise_Lote_Base");
        window.XLSX.writeFile(wb, `Relatorio_Lote_Classificacao_Industrial.xlsx`);
    }
};
