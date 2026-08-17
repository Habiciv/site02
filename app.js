const $=id=>document.getElementById(id),STORE="rng_provas_v2",SESSION="rng_provas_session",OWNER_EMAIL="lf1105111@gmail.com";
const ROLES=["membro","treinador","dono"];
const API="/api";
const seed=[{id:"seed1",title:"Prova de Exemplo — Level 1",level:1,points:10,questions:[
{text:"Pergunta 1: objetivo do sistema?",options:["Avaliar treinamentos","Alterar level","Apagar cadastros","Nenhuma"],answer:0},
{text:"Pergunta 2: quem pode criar provas?",options:["Membro","Treinador ou Dono","Visitante","Ninguém"],answer:1},
{text:"Pergunta 3: quantas questões tem cada prova?",options:["5","8","10","20"],answer:2},
{text:"Pergunta 4: quem responde cada prova?",options:["Todos juntos","Cada membro individualmente","Somente dono","Somente bot"],answer:1},
{text:"Pergunta 5: quem pode alterar uma prova?",options:["Membro","Treinador ou Dono","Visitante","Qualquer pessoa"],answer:1},
{text:"Pergunta 6: o que define a liberação da prova?",options:["Nome","Level configurado","E-mail","Data de cadastro"],answer:1},
{text:"Pergunta 7: quem pode promover cargos?",options:["Membro","Treinador","Dono","Visitante"],answer:2},
{text:"Pergunta 8: o resultado é individual?",options:["Sim","Não","Somente para dono","Somente para treinador"],answer:0},
{text:"Pergunta 9: o que é contabilizado?",options:["Acertos, erros e pontos","Somente nome","Somente level","Nada"],answer:0},
{text:"Pergunta 10: qual é o total obrigatório de questões?",options:["6","8","10","12"],answer:2}
]}];
function readJSON(key){try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}}
function loadDatabase(){
 const stored=readJSON(STORE);
 // Compatibilidade com a chave usada por versões mais antigas do protótipo.
 const legacy=readJSON("rng_provas");
 const data=stored||legacy||{};
 return {
   users:Array.isArray(data.users)?data.users:[],
   exams:Array.isArray(data.exams)&&data.exams.length?data.exams:seed,
   results:Array.isArray(data.results)?data.results:[]
 };
}
let db=loadDatabase(),current=readJSON(SESSION),currentExam=null,answers=[],qIndex=0;
function save(){localStorage.setItem(STORE,JSON.stringify(db))}
function normalizeRole(r){const role=String(r||"membro").toLowerCase();return ROLES.includes(role)?role:"membro"}
function roleLabel(r){return normalizeRole(r).toUpperCase()}
function isOwner(){return current&&normalizeRole(current.role)==="dono"}
function isTrainer(){return current&&["treinador","dono"].includes(normalizeRole(current.role))}
function ensureOwner(){let u=db.users.find(x=>String(x.email||"").toLowerCase()===OWNER_EMAIL);if(u){u.role="dono";u.level=Math.max(100,Number(u.level)||1);save()}return u}
function normalizeUsers(){
 let changed=false;
 db.users.forEach(u=>{
   if(!u.id){u.id=crypto.randomUUID();changed=true}
   if(!u.name){u.name="Usuário sem nome";changed=true}
   if(!u.email){u.email=`sem-email-${u.id}@local`;changed=true}
   if(!u.createdAt){u.createdAt=new Date().toISOString();changed=true}
   if(!Number.isFinite(Number(u.loginCount))) {u.loginCount=0;changed=true}
   if(u.lastLogin===undefined){u.lastLogin=null;changed=true}
   const role=normalizeRole(u.role);if(u.role!==role){u.role=role;changed=true}
   if(!u.level){u.level=1;changed=true}
 });
 if(changed)save();
}
function refreshCurrent(){
 if(!current)return;
 const user=db.users.find(u=>u.id===current.id)||db.users.find(u=>String(u.email||"").toLowerCase()===String(current.email||"").toLowerCase());
 if(!user){current=null;localStorage.removeItem(SESSION);return}
 current={...user};localStorage.setItem(SESSION,JSON.stringify(current));
}
async function api(path,method="GET",data){
 const options={method,headers:{"Content-Type":"application/json"}};if(data)options.body=JSON.stringify(data);
 const response=await fetch(API+path,options);const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível acessar o banco de dados.");return result;
}
async function importLocalUsers(){
 // Migra contas desta versão local para o banco na primeira abertura pelo servidor.
 await api("/users/import","POST",{users:db.users.filter(u=>u.name&&u.email&&u.pass)});
}
async function init(){
 normalizeUsers();ensureOwner();
 try{await importLocalUsers()}catch{console.warn("Banco indisponível. Inicie o servidor para usar cadastros centralizados.")}
 refreshCurrent();bind();current?showApp():showAuth()
}
function bind(){
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
 $("loginForm").onsubmit=e=>{e.preventDefault();login()};$("registerForm").onsubmit=e=>{e.preventDefault();register()};
 $("logoutBtn").onclick=logout;$("backBtn").onclick=hideExam;$("prevBtn").onclick=()=>{if(qIndex){saveAnswer();qIndex--;renderQuestion()}};
 $("nextBtn").onclick=()=>{saveAnswer();qIndex++;renderQuestion()};$("finishBtn").onclick=finishExam;
 $("examForm").onsubmit=e=>{e.preventDefault();createExam()};$("promotionForm").onsubmit=e=>{e.preventDefault();promote()};
 $("editExamForm").onsubmit=e=>{e.preventDefault();saveEditedExam()};$("cancelEditBtn").onclick=()=>cancelEdit();
}
function switchTab(t){document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===t));$("loginForm").classList.toggle("hidden",t!=="login");$("registerForm").classList.toggle("hidden",t!=="register")}
async function register(){
 const name=$("regName").value.trim(),email=$("regEmail").value.trim().toLowerCase(),pass=$("regPass").value;
 try{const {user}=await api("/auth/register","POST",{name,email,pass});db.users=db.users.filter(u=>u.id!==user.id&&String(u.email||"").toLowerCase()!==user.email);db.users.push(user);save();current={...user};localStorage.setItem(SESSION,JSON.stringify(current));showApp()}catch(e){msg("registerMsg",e.message)}
}
async function login(){
 const login=$("loginUser").value.trim(),pass=$("loginPass").value;
 try{const {user}=await api("/auth/login","POST",{login,pass});const i=db.users.findIndex(u=>u.id===user.id||String(u.email||"").toLowerCase()===user.email);if(i>=0)db.users[i]=user;else db.users.push(user);save();current={...user};localStorage.setItem(SESSION,JSON.stringify(current));showApp()}catch(e){msg("loginMsg",e.message)}
}
function logout(){current=null;localStorage.removeItem(SESSION);showAuth()}
function msg(id,t){$(id).textContent=t}
function showAuth(){$("authView").classList.remove("hidden");$("appView").classList.add("hidden");$("logoutBtn").classList.add("hidden")}
function showApp(){$("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");$("sessionInfo").textContent=current.name;$("welcome").textContent=`Olá, ${current.name}`;$("roleValue").textContent=normalizeRole(current.role).toUpperCase();$("levelValue").textContent=current.level;renderExams();$("staffPanel").classList.toggle("hidden",!isTrainer());$("promotionPanel").classList.toggle("hidden",!isTrainer());if(isTrainer()){renderAdmin();renderQuestionBuilder("questionBuilder",Array.from({length:10},(_,i)=>defaultQuestion(i+1)));$("resultsPanel").classList.remove("hidden");renderAllResults();renderUsers()}else $("resultsPanel").classList.add("hidden")}
function hasCompleted(examId){
 return !!db.results.find(r=>r.userId===current.id&&r.examId===examId);
}
function renderExams(){
 let list=db.exams.filter(e=>e.published!==false);
 $("examList").innerHTML=list.length?list.map(e=>{
   const done=hasCompleted(e.id);
   return `<article class="exam-card"><h4>${esc(e.title)}</h4>
   <p>Level ${e.level} · 10 questões · ${e.points} pts/acerto</p>
   ${done?`<span class="exam-status">✓ Já realizada</span><button class="ghost" disabled>Prova concluída</button>`:`<button class="primary" onclick="startExam('${e.id}')">Iniciar prova</button>`}
   </article>`;
 }).join(""):"<p>Nenhuma prova publicada.";
}
function startExam(id){
 currentExam=db.exams.find(e=>e.id===id);
 if(!currentExam)return;
 if(hasCompleted(currentExam.id)){
   alert("Você já realizou esta prova. Só um Treinador ou Dono pode permitir uma nova tentativa.");
   return;
 }
 qIndex=0;answers=[];
 $("memberPanel").classList.add("hidden");$("staffPanel").classList.add("hidden");$("promotionPanel").classList.add("hidden");$("resultPanel").classList.add("hidden");
 $("examPanel").classList.remove("hidden");$("examTitle").textContent=currentExam.title;$("examLevel").textContent="LEVEL "+currentExam.level;renderQuestion();
}
function renderQuestion(){let q=currentExam.questions[qIndex];$("questionArea").innerHTML=`<div class="question"><strong>${qIndex+1}.</strong> ${esc(q.text)}</div><div class="options">${q.options.map((o,i)=>`<label class="option"><input type="radio" name="opt" value="${i}" ${answers[qIndex]===i?"checked":""}>${esc(o)}</label>`).join("")}</div>`;$("progress").textContent=`${qIndex+1} / ${currentExam.questions.length}`;$("prevBtn").classList.toggle("hidden",qIndex===0);$("nextBtn").classList.toggle("hidden",qIndex===currentExam.questions.length-1);$("finishBtn").classList.toggle("hidden",qIndex!==currentExam.questions.length-1)}
function saveAnswer(){let r=document.querySelector('input[name="opt"]:checked');if(r)answers[qIndex]=Number(r.value)}
function finishExam(){
 if(!currentExam||hasCompleted(currentExam.id)){
   alert("Esta prova já foi realizada por este membro.");
   return;
 }
 saveAnswer();
 let correct=0;
 currentExam.questions.forEach((q,i)=>{if(answers[i]===q.answer)correct++});
 let errors=currentExam.questions.length-correct,score=correct*currentExam.points;
 db.results.push({id:crypto.randomUUID(),userId:current.id,examId:currentExam.id,correct,errors,score,date:new Date().toISOString()});
 save();
 $("examPanel").classList.add("hidden");$("resultPanel").classList.remove("hidden");
 $("resultPanel").innerHTML=`<p class="eyebrow">RESULTADO</p><h3>${esc(currentExam.title)}</h3><div class="score">${score} pontos</div>
 <div class="result-grid"><div class="stat">Acertos<br><strong>${correct}</strong></div><div class="stat">Erros<br><strong>${errors}</strong></div><div class="stat">Questões<br><strong>${currentExam.questions.length}</strong></div><div class="stat">Level<br><strong>${currentExam.level}</strong></div></div>
 <div class="result-note">✓ Esta prova foi registrada como concluída. Você não poderá refazê-la, a menos que um Treinador ou Dono libere uma nova tentativa.</div><br><button class="primary" onclick="backHome()">Voltar às provas</button>`;
}
function backHome(){$("resultPanel").classList.add("hidden");$("memberPanel").classList.remove("hidden");showApp()}
function hideExam(){$("examPanel").classList.add("hidden");backHome()}
function defaultQuestion(n){return {number:n,text:"",options:["","","",""],answer:0}}
function questionDataFromBuilder(containerId){
 const boxes=[...document.querySelectorAll(`#${containerId} .builder-question`)];
 if(boxes.length!==10)throw 1;
 return boxes.map((box,i)=>{
   const text=box.querySelector(".q-text").value.trim();
   const opts=[...box.querySelectorAll(".choice-text")].map(x=>x.value.trim());
   const selected=box.querySelector('input[type="radio"]:checked');
   if(!text||opts.some(x=>!x)||!selected)throw 1;
   return {number:i+1,text,options:opts,answer:Number(selected.value)};
 });
}
function renderQuestionBuilder(containerId,questions){
 const qs=questions&&questions.length===10?questions:Array.from({length:10},(_,i)=>defaultQuestion(i+1));
 $(containerId).innerHTML=qs.map((q,i)=>`
 <div class="builder-question">
   <h4>Questão ${i+1}</h4>
   <label>Enunciado<input class="q-text" value="${esc(q.text||"")}" required></label>
   <div class="field-note">Marque abaixo a alternativa que é a resposta correta:</div>
   ${["A","B","C","D"].map((letter,j)=>`
     <label class="answer-choice">
       <input type="radio" name="${containerId}-q${i}" value="${j}" ${Number(q.answer)===j?"checked":""}>
       <span class="choice-letter">${letter}</span>
       <input class="choice-text" value="${esc((q.options||["","","",""])[j]||"")}" placeholder="Alternativa ${letter}" required>
     </label>`).join("")}
 </div>`).join("");
}
function createExam(){
 if(!isTrainer())return;
 try{
   const qs=questionDataFromBuilder("questionBuilder");
   db.exams.push({id:crypto.randomUUID(),title:$("newTitle").value.trim(),level:Number($("newLevel").value),points:Number($("newPoints").value),questions:qs,createdBy:current.id,published:true});
   save();msg("staffMsg","Prova criada com 10 questões. As respostas corretas foram definidas pelo treinador/dono.");
   $("examForm").reset();renderQuestionBuilder("questionBuilder",Array.from({length:10},(_,i)=>defaultQuestion(i+1)));
   renderExams();renderAdmin();
 }catch(e){msg("staffMsg","Preencha as 10 questões, as alternativas A-D e marque uma resposta correta em cada questão.")}
}
function renderAdmin(){
 $("adminExamList").innerHTML=db.exams.map(e=>{
   const results=db.results.filter(r=>r.examId===e.id);
   return `<article class="exam-card"><h4>${esc(e.title)}</h4><p>Level ${e.level} · 10 questões · ${e.points} pts/acerto · ${results.length} tentativa(s)</p>
   <div class="edit-actions"><button class="ghost" onclick="editExam('${e.id}')">Alterar prova</button><button class="ghost" onclick="deleteExam('${e.id}')">Excluir</button></div>
   <div class="field-note">Liberar nova tentativa para um membro:</div>
   <select id="retry-${e.id}"><option value="">Selecione um membro</option>${db.users.map(u=>`<option value="${u.id}">${esc(u.name)} — ${esc(u.email)}</option>`).join("")}</select>
   <button class="primary" onclick="allowRetry('${e.id}')">Permitir refazer</button>
   </article>`;
 }).join("");
}
function allowRetry(examId){
 if(!isTrainer())return;
 const sel=$(`retry-${examId}`),userId=sel.value;
 if(!userId){alert("Selecione um membro.");return}
 db.results=db.results.filter(r=>!(r.examId===examId&&r.userId===userId));
 save();renderAdmin();renderExams();
 msg("staffMsg","Nova tentativa liberada para o membro selecionado.");
}
function editExam(id){
 if(!isTrainer())return;
 const e=db.exams.find(x=>x.id===id);if(!e)return;
 $("editId").value=e.id;$("editTitle").value=e.title;$("editLevel").value=e.level;$("editPoints").value=e.points;
 renderQuestionBuilder("editQuestionBuilder",e.questions);
 $("editPanel").classList.remove("hidden");
 window.scrollTo({top:$("editPanel").offsetTop-80,behavior:"smooth"});
}
function cancelEdit(){$("editPanel").classList.add("hidden")}
function saveEditedExam(){
 if(!isTrainer())return;
 try{
   const e=db.exams.find(x=>x.id===$("editId").value);if(!e)throw 1;
   const qs=questionDataFromBuilder("editQuestionBuilder");
   e.title=$("editTitle").value.trim();e.level=Number($("editLevel").value);e.points=Number($("editPoints").value);e.questions=qs;e.published=true;
   save();renderExams();renderAdmin();cancelEdit();msg("staffMsg","Prova alterada com sucesso. As respostas corretas continuam protegidas para membros.");
 }catch(e){msg("editMsg","Preencha as 10 questões e marque A, B, C ou D como correta em todas elas.")}
}
function removeExamAndResults(examId){
 if(!isTrainer())return;
 const exam=db.exams.find(x=>x.id===examId);if(!exam)return alert("Esta prova já foi removida.");
 const attempts=db.results.filter(x=>x.examId===examId).length;
 const detail=attempts===1?"1 resultado de aluno também será apagado.":`${attempts} resultados de alunos também serão apagados.`;
 if(!confirm(`Apagar a prova "${exam.title}"?\n\n${detail}\n\nEsta ação não pode ser desfeita.`))return;
 db.exams=db.exams.filter(x=>x.id!==examId);
 db.results=db.results.filter(x=>x.examId!==examId);
 save();
 renderExams();renderAdmin();renderAllResults();
 msg("staffMsg",`Prova removida com ${attempts} resultado(s) vinculado(s).`);
}
function deleteExam(id){removeExamAndResults(id)}
function renderAllResults(){
 if(!isTrainer())return;
 const rows=db.results.map(r=>({r,u:db.users.find(x=>x.id===r.userId),e:db.exams.find(x=>x.id===r.examId)}));
 if(!rows.length){$("allResults").innerHTML="<p class='hint'>Nenhum resultado registrado ainda.</p>";return}
 $("allResults").innerHTML=`<div class="result-filter"><label>Filtrar por prova<select id="resultExamFilter"><option value="">Todas as provas</option>${db.exams.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join("")}</select></label></div><div style="overflow:auto"><table class="results-table"><thead><tr><th>Membro</th><th>Prova</th><th>Level</th><th>Acertos</th><th>Erros</th><th>Pontos</th><th>Data</th><th>Ação</th></tr></thead><tbody id="resultsBody"></tbody></table></div>`;
 $("resultExamFilter").onchange=()=>renderResultsRows($("resultExamFilter").value);renderResultsRows("");
}
function renderResultsRows(filterId){
 if(!isTrainer())return;
 const rows=db.results.map(r=>({r,u:db.users.find(x=>x.id===r.userId),e:db.exams.find(x=>x.id===r.examId)})).filter(x=>!filterId||x.r.examId===filterId).sort((a,b)=>String(b.r.date).localeCompare(String(a.r.date)));
 $("resultsBody").innerHTML=rows.map(x=>`<tr><td>${esc(x.u?.name||"Usuário removido")}</td><td>${esc(x.e?.title||"Prova removida")}</td><td>${x.e?.level??"-"}</td><td class="result-good">${x.r.correct}</td><td class="result-bad">${x.r.errors}</td><td>${x.r.score}</td><td>${new Date(x.r.date).toLocaleString("pt-BR")}</td><td><button class="ghost danger" onclick="deleteExamWithResults('${x.r.examId}')">Apagar prova</button></td></tr>`).join("")||`<tr><td colspan="8">Nenhum resultado para este filtro.</td></tr>`;
}
function deleteExamWithResults(examId){removeExamAndResults(examId)}
async function renderUsers(){
 if(!isTrainer())return;
 let users;
 try{users=(await api(`/users?actorId=${encodeURIComponent(current.id)}`)).users;users.forEach(user=>{const i=db.users.findIndex(u=>u.id===user.id||String(u.email||"").toLowerCase()===user.email);if(i>=0)db.users[i]={...db.users[i],...user};else db.users.push(user)});save()}catch(e){msg("promotionMsg",e.message);return}
 $("promoteUser").innerHTML=users.length?users.map(u=>`<option value="${u.id}">${esc(u.name)} — ${esc(u.email)} — ${normalizeRole(u.role)}</option>`).join(""):"<option value=''>Nenhuma conta cadastrada</option>";
 $("promoteRole").innerHTML=isOwner()?`<option value="membro">Membro</option><option value="treinador">Treinador</option><option value="dono">Dono</option>`:`<option value="treinador">Treinador</option>`;
 const loggedIn=users.filter(u=>u.lastLogin).length;
 $("accountCount").textContent=`${users.length} pessoa(s) cadastrada(s) · ${loggedIn} já acessou/acessaram`;
 $("userList").innerHTML=users.map(u=>{
   const loginText=u.lastLogin?`Último login: ${new Date(u.lastLogin).toLocaleString("pt-BR")} · ${Number(u.loginCount||0)} login(s)`:"Ainda não fez login";
   return `<div class="user-row"><div class="user-meta"><strong>${esc(u.name)}</strong><span class="user-email">${esc(u.email)}</span><span class="user-login">${loginText} · Level ${Number(u.level||1)}</span></div><b class="user-role">${normalizeRole(u.role).toUpperCase()}</b></div>`;
 }).join("");
}
async function promote(){
 if(!isTrainer())return;
 const u=db.users.find(x=>x.id===$("promoteUser").value),r=$("promoteRole").value;if(!u)return;
 if(u.email===OWNER_EMAIL)return msg("promotionMsg","O Dono Principal não pode ter o cargo alterado.");
 if(!isOwner()&&r!=="treinador")return msg("promotionMsg","Treinador só pode dar o cargo de Treinador.");
 if(!isOwner()&&normalizeRole(u.role)==="dono")return msg("promotionMsg","Treinador não pode alterar um Dono.");
 try{const {user}=await api(`/users/${encodeURIComponent(u.id)}/role`,"PUT",{actorId:current.id,role:r});Object.assign(u,user);save();refreshCurrent();await renderUsers();msg("promotionMsg",`Cargo de ${u.name} alterado para ${roleLabel(user.role)}.`)}catch(e){msg("promotionMsg",e.message)}
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
init();
