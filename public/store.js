(() => {
  function button(number, label, action) { const item = document.createElement('button'); item.className = 'nav-btn'; item.innerHTML = `<span class="number">${number}</span>${label}`; item.onclick = action; nav.append(item); return item; }
  function showStore() {
    content.innerHTML = `<h1>Loja RNG</h1><p>Itens oficiais para representar a comunidade dentro do Roblox.</p><div class="grid"><article class="card wide"><div class="tag">CAMISA OFICIAL</div><h2>Moletom RNG</h2><p>Adquira o moletom oficial da RNG no catálogo do Roblox e use-o nos treinos e eventos.</p><a class="link-button" href="https://www.roblox.com/pt/catalog/5317141623/Moleton-RNG" target="_blank" rel="noreferrer">Ver no catálogo Roblox ↗</a></article><article class="card"><div class="tag">ITEM OFICIAL</div><h2>RNG</h2><p>Link seguro para o catálogo oficial.</p></article></div>`;
    document.querySelectorAll('.nav-btn').forEach((item, index) => item.classList.toggle('active', index === 5));
  }
  button('07', 'Loja', showStore);
  button('08', 'Divulgação', () => window.showPromotion());
  button('09', 'Recuperar senha', () => window.showPasswordRecovery());
  button('10', 'Mídias da RNG', () => window.showRngMedia());
})();
