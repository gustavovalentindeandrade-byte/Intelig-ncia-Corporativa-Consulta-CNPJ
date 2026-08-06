import { Utils } from './utils.js';

export const UI = {
    renderHistory(data, onSelectCnpj) {
        const container = document.getElementById('historyPills');
        if (!container) return;
        if (data && data.length > 0) {
            container.innerHTML = data.map(d => 
                `<span class="badge bg-secondary cursor-pointer" data-cnpj="${d.cnpj}">${Utils.formatCNPJ(d.cnpj)} - ${(d.razao_social||'').substring(0,18)}...</span>`
            ).join('');
            container.querySelectorAll('span').forEach(span => {
                span.addEventListener('click', () => {
                    onSelectCnpj(span.getAttribute('data-cnpj'));
                });
            });
        } else {
            container.innerHTML = '<small class="text-muted">Nenhum histórico recente.</small>';
        }
    },

    renderFicha(empresa, analise) {
        // --- PREENCHIMENTO LEGADO INTACTO ---
        document.getElementById('valRazaoSocial').textContent = empresa.razaoSocial || '-';
        document.getElementById('valNomeFantasia').textContent = empresa.nomeFantasia || 'Não informado';
        document.getElementById('valCnpj').textContent = Utils.formatCNPJ(empresa.cnpj);
        document.getElementById('valPorte').textContent = empresa.porte || 'Não informado';
        document.getElementById('valPerfil').textContent = analise.perfil;
        document.getElementById('valLocalizacao').textContent = `${empresa.municipio || '-'}/${empresa.uf || '-'}`;
        document.getElementById('valSituacao').textContent = empresa.situacaoCadastral || '-';
        document.getElementById('valAbertura').textContent = Utils.formatDate(empresa.dataAbertura);
        document.getElementById('valQtdSecundarias').textContent = empresa.cnaesSecundarios ? empresa.cnaesSecundarios.length : 0;

        const badgeHeader = document.getElementById('badgeIndustrialHeader');
        if (analise.possuiIndustrial) {
            badgeHeader.className = "badge fs-6 px-3 py-2 badge-industrial-yes";
            badgeHeader.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i> ✅ Possui CNAE Industrial`;
        } else {
            badgeHeader.className = "badge fs-6 px-3 py-2 badge-industrial-no";
            badgeHeader.innerHTML = `<i class="fa-solid fa-circle-xmark me-1"></i> ❌ Não possui CNAE Industrial`;
        }

        const motivacaoEl = document.getElementById('textoMotivacaoIndustrial');
        motivacaoEl.style.whiteSpace = "pre-line";
        motivacaoEl.textContent = analise.motivacaoIndustrial;

        const resumo = `A empresa <strong>${empresa.razaoSocial}</strong> (CNPJ: ${Utils.formatCNPJ(empresa.cnpj)}), localizada em ${empresa.municipio}/${empresa.uf}, enquadrada como <strong>${analise.perfil}</strong>, possui porte <strong>${empresa.porte || 'N/A'}</strong>. Atividade principal: <strong>${empresa.cnaePrincipalCod} - ${empresa.cnaePrincipalDesc}</strong>, com ${empresa.cnaesSecundarios ? empresa.cnaesSecundarios.length : 0} atividade(s) secundária(s). Situação Cadastral: <em>${empresa.situacaoCadastral || '-'}</em> (Aberta em ${Utils.formatDate(empresa.dataAbertura)}).`;
        document.getElementById('resumoTexto').innerHTML = resumo;

        document.getElementById('valCnaePrincipal').innerHTML = `<strong>${empresa.cnaePrincipalCod}</strong> - ${empresa.cnaePrincipalDesc} <span class="badge bg-primary ms-2">Principal</span>`;

        const tbody = document.getElementById('listCnaeSecundarioTable');
        tbody.innerHTML = '';

        analise.todasAnalisadas.forEach(item => {
            const tr = document.createElement('tr');
            const badgeTipo = item.tipo === 'Principal' ? '<span class="badge bg-primary">Principal</span>' : '<span class="badge bg-secondary">Secundária</span>';
            const badgeInd = item.isIndustrial ? '<span class="badge bg-success">Industrial (Presente na Base)</span>' : '<span class="badge bg-light text-dark border">Não Industrial</span>';
            
            tr.innerHTML = `
                <td class="font-weight-bold">${item.codigo}</td>
                <td>${item.descricao}</td>
                <td>${badgeTipo}</td>
                <td>${badgeInd}</td>
            `;
            tbody.appendChild(tr);
        });

        // --- NOVA CHAMADA: INJEÇÃO DA TABELA DE CARTEIRAS ---
        if (analise.analiseAvancada) {
            this._renderAnaliseAvancada(analise.analiseAvancada);
        }
    },

    // --- NOVO MÉTODO: GERAÇÃO DO CARD DE ANÁLISE AVANÇADA ---
    _renderAnaliseAvancada(analiseAvancada) {
        const resultContainer = document.getElementById('resultContainer');
        if (!resultContainer) return;

        // Evita duplicar se a seção já existir, apenas atualiza o conteúdo
        let section = document.getElementById('secaoAnaliseIndustrialAvancada');
        if (!section) {
            section = document.createElement('div');
            section.id = 'secaoAnaliseIndustrialAvancada';
            section.className = 'card shadow-sm mb-4 mt-4 border-primary';
            resultContainer.appendChild(section);
        }

        // Montagem das Linhas da Tabela
        const trs = analiseAvancada.resultados.map(cnae => `
            <tr>
                <td class="font-monospace fw-bold">${cnae.codigo}</td>
                <td class="small">${cnae.descricao}</td>
                <td><span class="badge ${cnae.principal ? 'bg-primary' : 'bg-secondary'}">${cnae.principal ? 'Principal' : 'Secundária'}</span></td>
                <td><span class="badge ${cnae.industrial === 'SIM' ? 'bg-success' : 'bg-light text-dark border'}">${cnae.industrial}</span></td>
                <td>${cnae.carteira}</td>
                <td>${cnae.macroSetor}</td>
            </tr>
        `).join('');

        const formatarLista = (lista) => lista && lista.length > 0 ? lista.join(', ') : '-';

        // Injeção do Layout Dinâmico
        section.innerHTML = `
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fa-solid fa-industry me-2"></i> Análise de Carteiras e Macro Setores</h5>
                <span class="badge bg-light text-dark">Total de Atividades: ${analiseAvancada.totalCnaes}</span>
            </div>
            <div class="card-body">
                <div class="table-responsive mb-4">
                    <table class="table table-hover table-bordered align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Código</th>
                                <th>Descrição</th>
                                <th>Tipo</th>
                                <th>Industrial</th>
                                <th>Carteira</th>
                                <th>Macro Setor</th>
                            </tr>
                        </thead>
                        <tbody>${trs}</tbody>
                    </table>
                </div>
                
                <div class="alert alert-secondary mb-0">
                    <h6 class="alert-heading fw-bold mb-3 border-bottom pb-2">Resumo Consolidado</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <ul class="list-unstyled mb-0">
                                <li class="mb-2"><strong>Empresa Industrial:</strong> ${analiseAvancada.empresaIndustrial === 'SIM' ? '<span class="text-success fw-bold">SIM</span>' : '<span class="text-danger fw-bold">NÃO</span>'}</li>
                                <li class="mb-2"><strong>CNAEs Industriais:</strong> ${analiseAvancada.qtdIndustrial}</li>
                                <li class="mb-2"><strong>CNAEs Não Industriais:</strong> ${analiseAvancada.qtdNaoIndustrial}</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <ul class="list-unstyled mb-0">
                                <li class="mb-2"><strong>Carteiras Identificadas:</strong> ${formatarLista(analiseAvancada.carteiras)}</li>
                                <li class="mb-2"><strong>Macro Setores:</strong> ${formatarLista(analiseAvancada.macroSetores)}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = `<div class="alert alert-${type} shadow-sm"><i class="fa-solid fa-circle-exclamation me-2"></i> ${message}</div>`;
        }
    },

    clearAlert() {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) alertContainer.innerHTML = '';
    },

    toggleLoading(isLoading) {
        const loading = document.getElementById('loadingIndicator');
        const btn = document.getElementById('btnConsultar');
        if (loading) loading.classList.toggle('d-none', !isLoading);
        if (btn) btn.disabled = isLoading;
    },

    toggleResult(hasResult) {
        const res = document.getElementById('resultContainer');
        if (res) res.classList.toggle('d-none', !hasResult);
    }
};
