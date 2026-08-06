import { CONFIG } from '../config/config.js';
import { Utils } from './utils.js';
import { CnpjService } from '../services/cnpjService.js';
import { IndustrialService } from '../services/industrialService.js';
import { HistoryRepository } from '../storage/historyRepository.js';
import { ExportService } from './export.js';
import { BatchService } from './batch.js';
import { UI } from './ui.js';

// 1. ESTADO GLOBAL DA APLICAÇÃO (Garante organização dos dados)
const AppState = {
    supabaseClient: null,
    companyData: null,
    analiseData: null,
    batchResults: []
};

// 2. INICIALIZAÇÃO DO BANCO DE DADOS (Feita apenas 1 vez para economizar rede)
try {
    if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
        AppState.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Erro ao inicializar Supabase:", e);
}

// 3. INICIALIZAÇÃO DA INTERFACE (Assim que a página carrega)
document.addEventListener("DOMContentLoaded", async () => {
    await carregarHistoricoInicial();
    setupTabs();
    setupInputs();
    setupActionButtons();
    setupBatchProcessing();
});

// ==========================================
// MÓDULOS DE CONFIGURAÇÃO DA INTERFACE
// ==========================================

async function carregarHistoricoInicial() {
    try {
        if (AppState.supabaseClient) {
            const historico = await HistoryRepository.carregar(AppState.supabaseClient);
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
}

function setupTabs() {
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
}

function setupInputs() {
    const inputCnpj = document.getElementById('cnpjInput');
    const btnConsultar = document.getElementById('btnConsultar');
    const btnLimpar = document.getElementById('btnLimpar');

    if (inputCnpj) {
        inputCnpj.addEventListener('input', e => e.target.value = Utils.formatCNPJ(e.target.value));
        inputCnpj.addEventListener('keypress', e => { if (e.key === 'Enter') realizarConsulta(); });
    }

    if (btnConsultar) btnConsultar.addEventListener('click', realizarConsulta);

    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (inputCnpj) inputCnpj.value = '';
            UI.toggleResult(false);
            UI.clearAlert();
            AppState.companyData = null;
            AppState.analiseData = null;
        });
    }
}

function setupActionButtons() {
    const btnCopiar = document.getElementById('btnCopiar');
    const btnImprimir = document.getElementById('btnImprimir');
    const btnPDF = document.getElementById('btnPDF');
    const btnExcel = document.getElementById('btnExcel');

    if (btnCopiar) btnCopiar.addEventListener('click', () => ExportService.copiar(AppState.companyData, AppState.analiseData));
    if (btnImprimir) btnImprimir.addEventListener('click', () => ExportService.imprimir());
    if (btnPDF) btnPDF.addEventListener('click', () => ExportService.pdf(AppState.companyData));
    if (btnExcel) btnExcel.addEventListener('click', () => ExportService.excelIndividual(AppState.companyData, AppState.analiseData));
}

function setupBatchProcessing() {
    const btnProcessarLote = document.getElementById('btnProcessarLote');
    const btnExportarLoteExcel = document.getElementById('btnExportarLoteExcel');

    if (btnExportarLoteExcel) {
        btnExportarLoteExcel.addEventListener('click', () => ExportService.excelLote(AppState.batchResults));
    }

    if (!btnProcessarLote) return;

    btnProcessarLote.addEventListener('click', async () => {
        const batchInputEl = document.getElementById('batchInput');
        const progressSpan = document.getElementById('batchProgress');
        const tbody = document.querySelector('#batchTable tbody');
        const batchResultContainer = document.getElementById('batchResultContainer');

        if (!batchInputEl) return;

        const rawText = batchInputEl.value;
        if (tbody) tbody.innerHTML = '';
        if (batchResultContainer) batchResultContainer.classList.remove('d-none');
        btnProcessarLote.disabled = true;
        if (btnExportarLoteExcel) btnExportarLoteExcel.classList.add('d-none');
        
        AppState.batchResults = []; // Limpa resultados anteriores

        const checkAnaliseSecundariosEl = document.getElementById('checkAnaliseSecundarios');
        const analisarSecundarias = checkAnaliseSecundariosEl ? checkAnaliseSecundariosEl.checked : true;

        await BatchService.processarLote(
            rawText,
            AppState.supabaseClient,
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
                    AppState.batchResults.push({
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
                if (AppState.batchResults.length > 0 && btnExportarLoteExcel) {
                    btnExportarLoteExcel.classList.remove('d-none');
                }
            }
        );
    });
}

// ==========================================
// LÓGICA CENTRAL DE CONSULTA INDIVIDUAL
// ==========================================
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
        // 1. Busca dados da empresa
        const empresa = await CnpjService.consultar(cnpj);
        AppState.companyData = empresa;

        const checkSec = document.getElementById('checkAnaliseSecundarios');
        const analisarSecundarias = checkSec ? checkSec.checked : true;
        
        // 2. Análise legada síncrona
        const analise = IndustrialService.analisar(empresa, analisarSecundarias);
        
        // 3. Análise avançada via Supabase (Reutilizando conexão)
        const analiseAvancada = await IndustrialService.obterClassificacaoAvancada(empresa, analisarSecundarias, AppState.supabaseClient);
        analise.analiseAvancada = analiseAvancada;
        AppState.analiseData = analise;

        // 4. Renderiza em tela
        UI.renderFicha(empresa, analise);

        // 5. Salva no histórico e atualiza a barra lateral
        if (AppState.supabaseClient) {
            await HistoryRepository.salvar(AppState.supabaseClient, empresa, analise);
            const novoHistorico = await HistoryRepository.carregar(AppState.supabaseClient);
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
