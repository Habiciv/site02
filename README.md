# RNG Centro de Comando — versão para hospedagem

Sistema web da RNG com cadastro, autenticação, auditoria de acesso, recuperação de senha por e-mail e área de Link Profissional.

## Cargos

- Proprietário
- Líder
- Treinador
- Aluno

Novos cadastros entram como **Aluno**.

## Permissões

- **Proprietário:** controle total sobre o site e os demais cargos.
- **Líder e Treinador:** acessam suas funções e podem definir usuários como Aluno, Treinador ou Líder.
- **Link Profissional:** disponível somente para Proprietário, Líder e Treinador.
- **Avisos (aba 06):** é visível a todos, mas somente Proprietário, Líderes e Treinadores podem acessá-la, publicar ou remover comunicados.

As permissões são validadas no servidor e também refletidas na interface.

## Cadastro, auditoria e recuperação de senha

- O cadastro bloqueia e informa claramente quando o e-mail já possui uma conta; nenhuma conta duplicada é criada.
- Os acessos são registrados em `data/users.json` em `accessLogs`, com evento, data/hora, usuário/e-mail, IP e agente do navegador. Senhas nunca são registradas.
- A recuperação usa tokens aleatórios de uso único, válidos por 30 minutos. O banco armazena apenas o hash do token; ao redefinir a senha, todas as sessões ativas daquele usuário são encerradas.
- Para evitar abusos, há um limite de três solicitações de recuperação por e-mail a cada hora.

### Configuração de e-mail (SMTP)

Copie `.env.example` para `.env` e preencha também as variáveis abaixo. Em produção, elas devem ser configuradas no painel da hospedagem.

- `APP_URL`: endereço público HTTPS do site, sem barra final (por exemplo, `https://rng.exemplo.com`).
- `SMTP_HOST`, `SMTP_PORT` e `SMTP_SECURE`: servidor SMTP. Em geral, porta `587` com `SMTP_SECURE=false`, ou porta `465` com `SMTP_SECURE=true`.
- `SMTP_USER` e `SMTP_PASS`: credenciais SMTP. Para Gmail e provedores semelhantes, use uma senha de aplicativo, nunca a senha normal da conta.
- `SMTP_FROM`: remetente exibido, por exemplo `"RNG Centro de Comando <no-reply@seudominio.com>"`.

Sem essas variáveis, a recuperação de senha informa que o envio de e-mail está indisponível e não cria um token utilizável.

## Publicação

O servidor usa a variável `PORT` fornecida pela plataforma de hospedagem. Não há dependências externas obrigatórias: basta Node.js.

### Render

O arquivo `render.yaml` já está incluído para facilitar a implantação. Ele configura:

- Node.js
- `npm start`
- `NODE_ENV=production`
- variáveis secretas para proprietário e sessão
- armazenamento persistente para `data/users.json`

Na publicação, defina `OWNER_EMAIL` e `INITIAL_OWNER_PASSWORD`. O `SESSION_SECRET` pode ser gerado pela própria configuração do Render.

Depois da publicação, a plataforma fornecerá um endereço HTTPS público. Esse é o endereço que você deve compartilhar — não use `localhost`.

### Outras plataformas Node.js

Use:

- Build: `npm install`
- Start: `npm start`

Configure as variáveis:

- `NODE_ENV=production`
- `OWNER_EMAIL=...`
- `INITIAL_OWNER_PASSWORD=...`
- `SESSION_SECRET=...` (mínimo de 32 caracteres)
- `APP_URL=https://...`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`
- `PORT` é normalmente fornecida automaticamente pela hospedagem.

**Importante:** como os usuários são armazenados em `data/users.json`, a hospedagem precisa oferecer armazenamento persistente. Sem isso, cadastros podem ser perdidos quando a aplicação for reiniciada ou redeployada.

## Desenvolvimento local

1. Instale o Node.js LTS.
2. Copie `.env.example` para `.env`.
3. Preencha os valores do proprietário e da sessão.
4. Execute `Iniciar site.cmd` no Windows ou `npm start` no terminal.
5. Abra `http://localhost:3000`.

Nunca publique `.env` nem senhas reais em um repositório público.
