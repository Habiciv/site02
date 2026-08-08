(() => {
  let tab = 'promotion';
  const copy = async value => { if (!value) return alert('Não há link ou código disponível para copiar.'); try { await navigator.clipboard.writeText(value); } catch { const input = document.querySelector('#promotion-value'); input.select(); document.execCommand('copy'); } alert('Copiado.'); };
  async function showPromotion() {
    if (!logged()) { content.innerHTML = '<h1>Divulgações</h1><p>Entre na sua conta para visualizar as divulgações da RNG.</p><button onclick="openAccount()">Entrar / Cadastrar</button>'; return; }
    try {
      const { promotion } = await api('/api/promotion');
      const staffAction = canManage() ? '<button class="action" onclick="openPromotionManager()">Gerenciar divulgação</button>' : '<p class="notice">Seu acesso é de visualização.</p>';
      const promotionBody = promotion.active ? `<h2>${esc(promotion.title)}</h2><p>${esc(promotion.description)}</p>${promotion.code ? `<div class="form"><input id="promotion-value" value="${esc(promotion.code)}" readonly><button type="button" onclick="copyPromotionValue()">Copiar código ou link</button></div>` : ''}` : '<h2>Nenhuma promoção ativa</h2><p>As próximas divulgações aparecerão aqui quando forem publicadas pela equipe.</p>';
      const liveBody = promotion.liveUrl ? `<h2>Transmissão ao vivo</h2><p>Acompanhe a transmissão oficial da RNG.</p><a class="link-button" href="${esc(promotion.liveUrl)}" target="_blank" rel="noreferrer">Assistir ao vivo ↗</a>` : '<h2>Nenhuma transmissão ao vivo</h2><p>Quando a equipe iniciar uma live, o link aparecerá aqui.</p>';
      content.innerHTML = `<h1>Divulgações</h1><p>Informações oficiais da RNG para toda a comunidade.</p><div class="subnav"><button class="${tab === 'promotion' ? 'active' : ''}" onclick="promotionTab('promotion')">Promoções</button><button class="${tab === 'live' ? 'active' : ''}" onclick="promotionTab('live')">Ao vivo</button></div><div class="grid"><article class="card wide"><div class="tag">${tab === 'live' ? 'AO VIVO' : promotion.active ? 'DIVULGAÇÃO ATIVA' : 'DIVULGAÇÃO'}</div>${tab === 'live' ? liveBody : promotionBody}${staffAction}</article>${card('Seu acesso', `<h2>${canManage() ? 'Gerenciamento liberado' : 'Visualização básica'}</h2><p>${canManage() ? 'Você pode atualizar promoções e a transmissão ao vivo.' : 'Acompanhe promoções e transmissões da comunidade.'}</p>`)}</div>`;
      document.querySelectorAll('.nav-btn').forEach((button, index) => button.classList.toggle('active', index === 6));
    } catch (error) { alert(error.message); }
  }
  window.promotionTab = value => { tab = value; showPromotion(); };
  window.copyPromotionValue = () => copy(document.querySelector('#promotion-value').value);
  window.showPromotion = showPromotion;
})();
