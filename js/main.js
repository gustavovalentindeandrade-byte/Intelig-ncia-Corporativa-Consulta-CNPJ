import { CONFIG } from '../config/config.js';
import { Utils } from './utils.js';
import { CnpjService } from '../services/cnpjService.js';
import { IndustrialService } from '../services/industrialService.js';
import { HistoryRepository } from '../storage/historyRepository.js';
import { ExportService } from './export.js';
import { BatchService } from './batch.js';
import { UI } from './ui.js';

let supabaseClient = null;
try {
    if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Erro ao inicializar Supabase:", e);
}

let currentCompanyData = null;
let currentAnaliseData = null;
let batchResultsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Carregar histórico inicial com segurança
        if (supabaseClient) {
            const historico = await HistoryRepository.carregar(supabaseClient);
            UI.renderHistory(historico, (cnpjSelecionado) => {
                const input = document.getElementById('cnpjInput');
                if (input) {
                    input.value = Utils.formatCNPJ(cnpjSelecionado);
                    realizarConsulta();
                }
            });
        }
    } catch (e) {
        console.error("Erro ao carregar histórico inicial:", e);
    }

    const inputCnpj = document.getElementById('cnpjInput');
    const btnConsultar = document.getElementById('btnConsultar');

    // Abas Navigation (Garantindo que funcionem sempre)
    const tabIndividual = document.getElementById('tabIndividual');
    const tabLote = document.getElementById('tabLote');
    const individualSection = document.getElementById('individualSection');
    const batchSection = document.getElementById('batchSection');

    if (tabIndividual && tabLote && individualSection && batchSection) {
        tabIndividual.addEventListener('click', () => {
            tabIndividual.className = 'btn btn-primary active py-2';
            tabLote.className = 'btn btn-outline-primary py-2';
            individualSection.classList.remove('d-none');
            batchSection.classList.add('d-none');
        });

        tabLote.addEventListener('click', () => {
            tabLote.className = 'btn btn-primary active py-2';
            tabIndividual.className = 'btn btn-outline-primary py-2';
            batchSection.classList.remove('d-none');
            individualSection.classList.add('d-none');
        });
    }

    if (inputCnpj) {
        inputCnpj.addEventListener('input', e => e.target.value = Utils.formatCNPJ(e.target.value));
        inputCnpj.addEventListener('keypress', e => { if (e.key === 'Enter') realizarConsulta(); });
    }

    if (btnConsultar) {
        btnConsultar.addEventListener('click', realizarConsulta);
    }

    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (inputCnpj) inputCnpj.value = '';
            UI.toggleResult(false);
            UI.clearAlert();
            currentCompanyData = null;
            currentAnaliseData = null;
        });
    }

    // Botões de Exportação e Ações
    const btnCopiar = document.getElementById('btnCopiar');
    if (btnCopiar) btnCopiar.addEventListener('click', () => ExportService.copiar(currentCompanyData, currentAnaliseData));

    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) btnImprimir.addEventListener('click', () => ExportService.imprimir());

    const btnPDF = document.getElementById('btnPDF');
    if (btnPDF) btnPDF.addEventListener('click', () => ExportService.pdf(currentCompanyData));

    const btnExcel = document.getElementById('btnExcel');
    if (btnExcel) btnExcel.addEventListener('click', () => ExportService.excelIndividual(currentCompanyData, currentAnaliseData));

    // Processamento em Lote
    const btnProcessarLote = document.getElementById('btnProcessarLote');
    if (btnProcessarLote) {
        btnProcessarLote.addEventListener('click', async () => {
            const batchInputEl = document.getElementById('batchInput');
            const progressSpan = document.getElementById('batchProgress');
            const tbody = document.querySelector('#batchTable tbody');
            const batchResultContainer = document.getElementById('batchResultContainer');
            const btnExportarLoteExcel = document.getElementById('btnExportarLoteExcel');

            if (!batchInputEl) return;

            const rawText = batchInputEl.value;
            if (tbody) tbody.innerHTML = '';
            if (batchResultContainer) batchResultContainer.classList.remove('d-none');
            btnProcessarLote.disabled = true;
            if (btnExportarLoteExcel) btnExportarLoteExcel.classList.add('d-none');
            batchResultsData = [];

            const checkAnaliseSecundariosEl = document.getElementById('checkAnaliseSecundarios');
            const analisarSecundarias = checkAnaliseSecundariosEl ? checkAnaliseSecundariosEl.checked : true;

            await BatchService.processarLote(
                rawText,
                supabaseClient,
                analisarSecundarias,
                (current, total) => {
                    if (progressSpan) progressSpan.textContent = `Processando ${current} de ${total}...`;
                },
                (formattedCnpj, empresa, analise, status, errorMsg) => {
                    if (!tbody) return;
                    const tr = document.createElement('tr');
                    if (status === 'Inválido') {
                        tr.innerHTML = `<td>${formattedCnpj}</td><td colspan="6" class="text-danger">${errorMsg}</td><td><span class="badge bg-danger">Inválido</span></td>`;
                    } else if (status === 'Erro') {
                        tr.innerHTML = `<td>${formattedCnpj}</td><td colspan="6" class="text-danger">${errorMsg}</td><td><span class="badge bg-danger">Erro API</span></td>`;
                    } else {
                        const badgeIndHtml = analise.possuiIndustrial ? 
                            '<span class="badge bg-success">✅ Possui Industrial</span>' : 
                            '<span class="badge bg-danger">❌ Não Possui</span>';
                        const listaCnaesStr = analise.cnaesIndustriaisLista.length > 0 ? analise.cnaesIndustriaisLista.join(", ") : "-";

                        tr.innerHTML = `
                            <td class="font-monospace">${formattedCnpj}</td>
                            <td>${empresa.razaoSocial || '-'}</td>
                            <td>${empresa.porte || '-'}</td>
                            <td><span class="badge bg-primary">${analise.perfil}</span></td>
                            <td>${empresa.municipio || '-'}/${empresa.uf || '-'}</td>
                            <td>${badgeIndHtml}</td>
                            <td class="small text-muted">${listaCnaesStr}</td>
                            <td><span class="badge bg-success">Sucesso</span></td>
                        `;

                        const adv = analise.analiseAvancada || {};
                        batchResultsData.push({
                            CNPJ: formattedCnpj,
                            Razao_Social: empresa.razaoSocial,
                            Porte: empresa.porte,
                            Perfil: analise.perfil,
                            Municipio_UF: `${empresa.municipio}/${empresa.uf}`,
                            Possui_CNAE_Industrial: analise.possuiIndustrial ? "Sim" : "Não",
                            CNAEs_Industriais_Encontradas: listaCnaesStr,
                            Empresa_Industrial: adv.empresaIndustrial || "NÃO",
                            Qtd_CNAEs: adv.totalCnaes || 0,
                            Carteiras: adv.carteiras && adv.carteiras.length > 0 ? adv.carteiras.join(', ') : "-",
                            Macro_Setores: adv.macroSetores && adv.macroSetores.length > 0 ? adv.macroSetores.join(', ') : "-"
                        });
                    }
                    tbody.appendChild(tr);
                },
                (results) => {
                    if (progressSpan) progressSpan.textContent = `Lote processado com sucesso! (${results.length} empresas analisadas)`;
                    btnProcessarLote.disabled = false;
                    if (batchResultsData.length > 0 && btnExportarLoteExcel) {
                        btnExportarLoteExcel.classList.remove('d-none');
                    }
                }
            );
        });
    }

    const btnExportarLoteExcel = document.getElementById('btnExportarLoteExcel');
    if (btnExportarLoteExcel) {
        btnExportarLoteExcel.addEventListener('click', () => ExportService.excelLote(batchResultsData));
    }
});

// Função de Consulta Individual isolada e segura
async function realizarConsulta() {
    const inputCnpj = document.getElementById('cnpjInput');
    if (!inputCnpj) return;

    const cnpj = inputCnpj.value;
    UI.clearAlert();

    if (!Utils.isValidCNPJ(cnpj)) {
        UI.showAlert('CNPJ inválido estruturalmente. Verifique os dígitos.', 'warning');
        return;
    }

    UI.toggleResult(false);
    UI.toggleLoading(true);

    try {
        const empresa = await CnpjService.consultar(cnpj);
        currentCompanyData = empresa;

        const checkSec = document.getElementById('checkAnaliseSecundarios');
        const analisarSecundarias = checkSec ? checkSec.checked : true;
        
        // 1. Análise legada síncrona
        const analise = IndustrialService.analisar(empresa, analisarSecundarias);
        
        // 2. Análise avançada via Supabase
        const supabaseClient = window.supabase && CONFIG.SUPABASE_URL ? 
            window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;
            
        const analiseAvancada = await IndustrialService.obterClassificacaoAvancada(empresa, analisarSecundarias, supabaseClient);
        analise.analiseAvancada = analiseAvancada;
        currentAnaliseData = analise;

        UI.renderFicha(empresa, analise);

        if (supabaseClient) {
            await HistoryRepository.salvar(supabaseClient, empresa, analise);
            const novoHistorico = await HistoryRepository.carregar(supabaseClient);
            UI.renderHistory(novoHistorico, (cnpjSel) => {
                inputCnpj.value = Utils.formatCNPJ(cnpjSel);
                realizarConsulta();
            });
        }

        UI.toggleLoading(false);
        UI.toggleResult(true);
    } catch (error) {
        UI.toggleLoading(false);
        UI.showAlert(error.message || 'Erro desconhecido ao realizar consulta.', 'danger');
    }
}
