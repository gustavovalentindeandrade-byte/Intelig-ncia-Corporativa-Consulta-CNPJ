import { CONFIG } from '../config/config.js';
import { Utils } from './utils.js';
import { CnpjService } from '../services/cnpjService.js';
import { IndustrialService } from '../services/industrialService.js';
import { HistoryRepository } from '../storage/historyRepository.js';
import { ExportService } from './export.js';
import { BatchService } from './batch.js';
import { UI } from './ui.js';

let supabaseClient = null;
if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Erro ao inicializar Supabase:", e);
    }
}

let currentCompanyData = null;
let batchResultsData = [];

document.addEventListener("DOMContentLoaded", () => {
    // 1. ATIVA A INTERFACE IMEDIATAMENTE (Nenhum bloqueio de rede atrasa os botões)
    const inputCnpj = document.getElementById('cnpjInput');
    const btnConsultar = document.getElementById('btnConsultar');

    // Abas Navigation
    const tabIndividual = document.getElementById('tabIndividual');
    const tabLote = document.getElementById('tabLote');
    const individualSection = document.getElementById('individualSection');
    const batchSection = document.getElementById('batchSection');

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

    inputCnpj.addEventListener('input', e => e.target.value = Utils.formatCNPJ(e.target.value));
    inputCnpj.addEventListener('keypress', e => { if (e.key === 'Enter') realizarConsulta(); });
    btnConsultar.addEventListener('click', realizarConsulta);

    document.getElementById('btnLimpar').addEventListener('click', () => {
        inputCnpj.value = '';
        UI.toggleResult(false);
        UI.clearAlert();
        currentCompanyData = null;
    });

    document.getElementById('btnCopiar').addEventListener('click', () => ExportService.copiar(currentCompanyData));
    document.getElementById('btnImprimir').addEventListener('click', () => ExportService.imprimir());
    document.getElementById('btnPDF').addEventListener('click', () => ExportService.pdf(currentCompanyData));
    document.getElementById('btnExcel').addEventListener('click', () => ExportService.excelIndividual(currentCompanyData));

    document.getElementById('btnProcessarLote').addEventListener('click', async () => {
        const rawText = document.getElementById('batchInput').value;
        const progressSpan = document.getElementById('batchProgress');
        const tbody = document.querySelector('#batchTable tbody');
        tbody.innerHTML = '';
        document.getElementById('batchResultContainer').classList.remove('d-none');
        document.getElementById('btnProcessarLote').disabled = true;
        document.getElementById('btnExportarLoteExcel').classList.add('d-none');
        batchResultsData = [];

        const analisarSecundarias = document.getElementById('checkAnaliseSecundarios').checked;

        await BatchService.processarLote(
            rawText,
            supabaseClient,
            analisarSecundarias,
            (current, total) => {
                progressSpan.textContent = `Processando ${current} de ${total}...`;
            },
            (formattedCnpj, empresa, analise, status, errorMsg) => {
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
                    batchResultsData.push({
                        CNPJ: formattedCnpj,
                        Razao_Social: empresa.razaoSocial,
                        Porte: empresa.porte,
                        Perfil: analise.perfil,
                        Municipio_UF: `${empresa.municipio}/${empresa.uf}`,
                        Possui_CNAE_Industrial: analise.possuiIndustrial ? "Sim" : "Não",
                        CNAEs_Industriais_Encontradas: listaCnaesStr
                    });
                }
                tbody.appendChild(tr);
            },
            (results) => {
                progressSpan.textContent = `Lote processado com sucesso! (${results.length} empresas analisadas)`;
                document.getElementById('btnProcessarLote').disabled = false;
                if (batchResultsData.length > 0) {
                    document.getElementById('btnExportarLoteExcel').classList.remove('d-none');
                }
            }
        );
    });

    document.getElementById('btnExportarLoteExcel').addEventListener('click', () => ExportService.excelLote(batchResultsData));

    async function realizarConsulta() {
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

            const analisarSecundarias = document.getElementById('checkAnaliseSecundarios').checked;
            const analise = IndustrialService.analisar(empresa, analisarSecundarias);

            UI.renderFicha(empresa, analise);
            
            // Salva e atualiza histórico em background (não trava a UI)
            HistoryRepository.salvar(supabaseClient, empresa, analise).then(() => {
                HistoryRepository.carregar(supabaseClient).then(novoHistorico => {
                    UI.renderHistory(novoHistorico, (cnpjSel) => {
                        inputCnpj.value = Utils.formatCNPJ(cnpjSel);
                        realizarConsulta();
                    });
                });
            });

            UI.toggleLoading(false);
            UI.toggleResult(true);
        } catch (error) {
            UI.toggleLoading(false);
            UI.showAlert(error.message, 'danger');
        }
    }

    // 2. CARREGA O HISTÓRICO EM SEGUNDO PLANO (Não bloqueia o carregamento da página)
    if (supabaseClient) {
        HistoryRepository.carregar(supabaseClient).then(historico => {
            UI.renderHistory(historico, (cnpjSelecionado) => {
                document.getElementById('cnpjInput').value = Utils.formatCNPJ(cnpjSelecionado);
                realizarConsulta();
            });
        }).catch(err => {
            console.warn("Não foi possível carregar o histórico:", err);
            document.getElementById('historyPills').innerHTML = '<small class="text-muted">Histórico indisponível temporariamente.</small>';
        });
    } else {
        document.getElementById('historyPills').innerHTML = '<small class="text-muted">Supabase não configurado.</small>';
    }
});
