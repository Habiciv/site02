(() => {
  async function showRngMedia() {
    try {
      const { media } = await api('/api/media');
      content.innerHTML = `<section class="media-hero"><div><span class="badge">EQUIPE DE MÍDIA</span><h1>${esc(media.title)}</h1><p>${esc(media.description)}</p></div><div class="media-mark" aria-hidden="true">RNG<br><small>MEDIA</small></div></section><div class="grid"><article class="card wide"><div class="tag">CENTRO CRIATIVO</div><h2>Representação oficial</h2><p>Esta área é exclusiva para o cargo Mídia. Use-a como ponto de referência para registrar treinos, eventos e as melhores histórias da comunidade.</p><a class="link-button" href="https://discord.gg/AGRcNJF9q" target="_blank" rel="noreferrer">Abrir Discord oficial ↗</a></article><article class="card"><div class="tag">SEU CARGO</div><h2>${esc(roleName(user.role))}</h2><p>Você mantém todas as funções de Membro, com acesso adicional à área de Mídias da RNG.</p></article></div>`;
      document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.textContent.includes('Mídias da RNG')));
    } catch (error) { alert(error.message); render(); }
  }
  window.showRngMedia = showRngMedia;
})();
