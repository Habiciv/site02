# RNG Centro de Comando — versão para hospedagem

Sistema web da RNG com cadastro, autenticação, 7 cargos e área de Link Profissional.

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

As permissões são validadas no servidor e também refletidas na interface.

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
- `PORT` é normalmente fornecida automaticamente pela hospedagem.

**Importante:** como os usuários são armazenados em `data/users.json`, a hospedagem precisa oferecer armazenamento persistente. Sem isso, cadastros podem ser perdidos quando a aplicação for reiniciada ou redeployada.

## Desenvolvimento local

1. Instale o Node.js LTS.
2. Copie `.env.example` para `.env`.
3. Preencha os valores do proprietário e da sessão.
4. Execute `Iniciar site.cmd` no Windows ou `npm start` no terminal.
5. Abra `http://localhost:3000`.

Nunca publique `.env` nem senhas reais em um repositório público.

## Bot do Discord (opcional)

O arquivo `discord-bot.js` sincroniza entradas, atualizações e banimentos do servidor do Discord com o site. Para usá-lo:

1. Defina `DISCORD_BOT_TOKEN`, `SITE_URL` (endereço público do site) e `SYNC_API_KEY` (a mesma chave no site e no bot) no `.env`.
2. Rode `npm run bot` num processo separado do site (no Render, use um serviço do tipo *worker*, já incluso em `render.yaml`).
