(() => {
  const allowed = () => ['owner', 'leader', 'trainer'].includes(user?.role);
  const formatDate = value => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  async function showNotices() {
    if (!allowed()) return alert('A aba Avisos é exclusiva para Proprietário, Líderes e Treinadores.');
    try {
      const { notices } = await api('/api/notices');
      const items = notices.length ? notices.map(notice => `<article class="card wide"><div class="tag">AVISO</div><h2>${esc(notice.title)}</h2><p style="white-space:pre-wrap">${esc(notice.message)}</p><small>Publicado por ${esc(notice.createdByName || 'Equipe RNG')} em ${formatDate(notice.createdAt)}</small><br><button class="secondary" type="button" onclick="removeNotice('${notice.id}')">Remover aviso</button></article>`).join('') : '<p class="empty">Ainda não há avisos publicados.</p>';
      content.innerHTML = `<h1>Avisos</h1><p>Comunicações reservadas ao Proprietário, aos Líderes e aos Treinadores.</p><article class="card wide"><div class="tag">NOVO AVISO</div><div class="form"><input id="notice-title" maxlength="120" placeholder="Título do aviso"><textarea id="notice-message" maxlength="2000" placeholder="Mensagem do aviso"></textarea><button type="button" onclick="createNotice()">Publicar aviso</button></div></article><div class="grid" style="margin-top:15px">${items}</div>`;
      document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.id === 'notices-nav'));
    } catch (error) { alert(error.message); }
  }

  window.showNotices = showNotices;
  window.createNotice = async () => { try { await api('/api/notices', { method: 'POST', body: JSON.stringify({ title: document.querySelector('#notice-title').value, message: document.querySelector('#notice-message').value }) }); showNotices(); } catch (error) { alert(error.message); } };
  window.removeNotice = async id => { if (!confirm('Remover este aviso?')) return; try { await api(`/api/notices/${id}`, { method: 'DELETE' }); showNotices(); } catch (error) { alert(error.message); } };
})();
