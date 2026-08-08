(() => {
  const copy = async value => { if (!value) return alert('Não há link ou código disponível para copiar.'); try { await navigator.clipboard.writeText(value); } catch { const input = document.querySelector('#promotion-value'); input.select(); document.execCommand('copy'); } alert('Copiado.'); };
  async function showPromotion() {
    if (!logged()) { content.innerHTML = '<h1>Divulgações</h1><p>Entre na sua conta para visualizar as divulgações da RNG.</p><button onclick="openAccount()">Entrar / Cadastrar</button>'; return; }
    try {
      const { promotion } = await api('/api/promotion');
      const staffAction = canManage() ? '<button class="action" onclick="openPromotionManager()">Gerenciar promoção</button>' : '<p class="notice">Seu acesso é de visualização. Para editar uma divulgação, fale com um Proprietário, Líder ou Treinador.</p>';
      const status = promotion.active ? 'DIVULGAÇÃO ATIVA' : 'DIVULGAÇÃO';
      const body = promotion.active ? `<h2>${esc(promotion.title)}</h2><p>${esc(promotion.description)}</p>${promotion.code ? `<div class="form"><input id="promotion-value" value="${esc(promotion.code)}" readonly aria-label="Código ou link da promoção"><button type="button" onclick="copyPromotionValue()">Copiar código ou link</button></div>` : ''}` : '<h2>Nenhuma promoção ativa</h2><p>As próximas divulgações aparecerão aqui quando forem publicadas pela equipe.</p>';
      content.innerHTML = `<h1>Divulgações</h1><p>Informações oficiais da RNG para toda a comunidade.</p><div class="grid"><article class="card wide"><div class="tag">${status}</div>${body}${staffAction}</article>${card('Seu acesso', `<h2>${canManage() ? 'Gerenciamento liberado' : 'Visualização básica'}</h2><p>${canManage() ? 'Você pode criar e atualizar as promoções da comunidade.' : 'Aluno e Membro podem acompanhar esta área e as demais opções abertas.'}</p>`)}</div>`;
      document.querySelectorAll('.nav-btn').forEach((button, index) => button.classList.toggle('active', index === 7));
    } catch (error) { alert(error.message); }
  }
  window.copyPromotionValue = () => copy(document.querySelector('#promotion-value').value);
  window.showPromotion = showPromotion;
})();
