window.RNGPromotion = {
  async render() {
    const content = document.getElementById('content');

    try {
      const { promotion } = await RNGStore.api('/api/promotion');

      content.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Promoções</h2>
              <p>Divulgações disponíveis para os usuários.</p>
            </div>
          </div>
          ${
            promotion.active
              ? `<article class="card">
                  <span class="role">ATIVA</span>
                  <h3>${escapeHtml(promotion.title)}</h3>
                  <p>${escapeHtml(promotion.description)}</p>
                  ${promotion.code ? `<p><strong>Código:</strong> ${escapeHtml(promotion.code)}</p>` : ''}
                </article>`
              : `<div class="empty-state">Nenhuma promoção ativa no momento.</div>`
          }
        </div>
      `;
    } catch (error) {
      content.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }
};
