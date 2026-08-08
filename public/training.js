(() => {
  const storageKey = 'rng-training-videos';
  const topics = ['Fundamentos', 'Táticas', 'Avançado'];
  let selected = 0;
  const canEdit = () => ['owner', 'leader', 'trainer'].includes(user?.role);
  const read = () => { try { return JSON.parse(localStorage.getItem(storageKey)) || [[], [], []]; } catch { return [[], [], []]; } };
  const write = videos => localStorage.setItem(storageKey, JSON.stringify(videos));
  const safeUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const youtube = url => { try { const u = new URL(url); const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v'); return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : ''; } catch { return ''; } };
  function showTraining() {
    const videos = read(), current = videos[selected] || [];
    const cards = current.length ? current.map((video, i) => {
      const embed = youtube(video.url);
      return `<article class="card">${embed ? `<iframe width="100%" height="180" src="${embed}" title="${esc(video.title)}" allowfullscreen style="border:0;border-radius:8px;margin-bottom:12px"></iframe>` : ''}<div class="tag">VÍDEO ${i + 1}</div><h2>${esc(video.title)}</h2><p><a class="link-button" href="${esc(video.url)}" target="_blank" rel="noreferrer">Assistir vídeo ↗</a></p>${canEdit() ? `<button class="action" onclick="removeTrainingVideo(${selected},${i})">Remover</button>` : ''}</article>`;
    }).join('') : '<p class="empty">Ainda não há vídeos nesta aba.</p>';
    content.innerHTML = `<h1>Treinamentos</h1><p>Escolha uma aba e aprenda no seu ritmo com os vídeos da RNG.</p><div class="subnav">${topics.map((topic, i) => `<button class="${i === selected ? 'active' : ''}" onclick="openTrainingTopic(${i})">${topic}</button>`).join('')}</div>${canEdit() ? `<article class="card"><div class="tag">ADICIONAR VÍDEO</div><h2>Novo conteúdo em ${topics[selected]}</h2><div class="form"><input id="video-title" placeholder="Título do vídeo"><input id="video-url" type="url" placeholder="Cole o link do YouTube ou outro vídeo"><button type="button" onclick="addTrainingVideo()">Adicionar vídeo</button></div></article>` : ''}<div class="grid" style="margin-top:15px">${cards}</div>`;
    document.querySelectorAll('.nav-btn').forEach((b, i) => b.classList.toggle('active', i === 1));
  }
  window.openTrainingTopic = index => { selected = index; showTraining(); };
  window.addTrainingVideo = () => {
    const title = document.querySelector('#video-title').value.trim(), url = safeUrl(document.querySelector('#video-url').value.trim());
    if (!title || !url) return alert('Informe um título e um link válido (http ou https).');
    const videos = read(); videos[selected].push({ title, url }); write(videos); showTraining();
  };
  window.removeTrainingVideo = (topic, index) => { const videos = read(); videos[topic].splice(index, 1); write(videos); showTraining(); };
  setTimeout(() => { const trainingButton = document.querySelectorAll('.nav-btn')[1]; if (trainingButton) trainingButton.onclick = showTraining; }, 0);
})();
