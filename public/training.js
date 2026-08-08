(() => {
  const topics = ['Fundamentos', 'Táticas', 'Avançado'];
  let selected = 0;
  const canEdit = () => ['owner', 'leader', 'trainer'].includes(user?.role);
  const safeUrl = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const youtube = url => { try { const parsed = new URL(url); const id = parsed.hostname.includes('youtu.be') ? parsed.pathname.slice(1) : parsed.searchParams.get('v'); return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : ''; } catch { return ''; } };
  async function showTraining() {
    if (!logged()) { render(1); return; }
    try {
      const { trainings, progress } = await api('/api/trainings');
      const current = trainings[selected] || [], topicProgress = progress[selected] || { xp: 0, unlocked: 0 };
      const cards = current.length ? current.map((video, index) => {
        const unlocked = index < topicProgress.unlocked, canComplete = unlocked && index === topicProgress.unlocked - 1 && topicProgress.unlocked < current.length;
        if (!unlocked) return `<article class="card"><div class="tag">BLOQUEADO</div><h2>Vídeo ${index + 1}</h2><p>Conclua o vídeo anterior para liberar este conteúdo no seu progresso.</p></article>`;
        const embed = youtube(video.url);
        return `<article class="card">${embed ? `<iframe width="100%" height="180" src="${embed}" title="${esc(video.title)}" allowfullscreen style="border:0;border-radius:8px;margin-bottom:12px"></iframe>` : ''}<div class="tag">VÍDEO ${index + 1} · LIBERADO</div><h2>${esc(video.title)}</h2><p>Assista nesta página e conclua para avançar. O próximo vídeo permanece bloqueado até sua conclusão.</p>${canComplete ? `<button class="action" onclick="completeTrainingVideo('${video.id}')">Concluir vídeo (+10 XP · +1 nível)</button>` : ''}${canEdit() ? `<button class="action" onclick="removeTrainingVideo('${video.id}')">Remover</button>` : ''}</article>`;
      }).join('') : '<p class="empty">Ainda não há vídeos nesta aba.</p>';
      content.innerHTML = `<h1>Treinamentos</h1><p>Conclua os vídeos em ordem para ganhar XP e subir de nível.</p><div class="subnav">${topics.map((topic, index) => `<button class="${index === selected ? 'active' : ''}" onclick="openTrainingTopic(${index})">${topic} · ${progress[index]?.xp || 0} XP</button>`).join('')}</div><p class="badge">SEU PROGRESSO: ${topicProgress.xp} XP · NÍVEL ${topicProgress.level || 0}/5 · ${topicProgress.unlocked}/${current.length} VÍDEOS LIBERADOS</p>${canEdit() ? `<article class="card"><div class="tag">PUBLICAR TREINAMENTO</div><h2>Novo conteúdo em ${topics[selected]}</h2><div class="form"><input id="video-title" placeholder="Título do vídeo"><input id="video-url" type="url" placeholder="Cole o link do YouTube ou outro vídeo"><button type="button" onclick="addTrainingVideo()">Publicar para todos</button></div></article>` : ''}<div class="grid" style="margin-top:15px">${cards}</div>`;
      document.querySelectorAll('.nav-btn').forEach((button, index) => button.classList.toggle('active', index === 1));
    } catch (error) { alert(error.message); }
  }
  window.openTrainingTopic = index => { selected = index; showTraining(); };
  window.addTrainingVideo = async () => { const title = document.querySelector('#video-title').value.trim(), url = safeUrl(document.querySelector('#video-url').value.trim()); if (!title || !url) return alert('Informe um título e um link válido (http ou https).'); try { await api('/api/trainings', { method: 'POST', body: JSON.stringify({ topic: selected, title, url }) }); showTraining(); } catch (error) { alert(error.message); } };
  window.completeTrainingVideo = async id => { try { await api(`/api/trainings/${selected}/${id}/complete`, { method: 'POST' }); showTraining(); } catch (error) { alert(error.message); } };
  window.removeTrainingVideo = async id => { if (!confirm('Remover este treinamento para todos?')) return; try { await api(`/api/trainings/${selected}/${id}`, { method: 'DELETE' }); showTraining(); } catch (error) { alert(error.message); } };
  setTimeout(() => { const trainingButton = document.querySelectorAll('.nav-btn')[1]; if (trainingButton) trainingButton.onclick = showTraining; }, 0);
})();
