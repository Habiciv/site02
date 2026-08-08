# RNG Centro de Comando

Projeto organizado do Centro de Comando RNG, pronto para GitHub + Railway/Render.

## Estrutura

```text
RNG-Centro-Comando/
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── Procfile
├── render.yaml
├── discord-bot.js
├── data/
│   └── .gitkeep
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── training.js
    ├── promotion.js
    └── store.js
```

## Rodar no Windows

Instale o Node.js LTS. Depois, no CMD dentro da pasta:

```bash
npm install
npm start
```

Abra:

```text
http://localhost:3000
```

## Variáveis no Railway/Render

Configure no painel da hospedagem:

```text
OWNER_EMAIL=seu-email
INITIAL_OWNER_PASSWORD=sua-senha
SESSION_SECRET=uma-chave-com-32-caracteres-ou-mais
```

O `DISCORD_BOT_TOKEN` é usado somente quando o bot do Discord for executado como serviço separado.

## GitHub

O arquivo `server.js` e o `package.json` ficam na raiz.

A pasta `public` precisa ficar na raiz também:

```text
public/index.html
public/style.css
public/app.js
public/training.js
public/promotion.js
public/store.js
```

Não coloque o projeto dentro de uma segunda pasta.

## Railway

1. Crie um projeto no Railway.
2. Conecte o repositório GitHub.
3. O Railway deve detectar Node.js.
4. Start command:

```text
npm start
```

5. Configure as variáveis de ambiente.
6. Gere um domínio público em Networking.

## Observação sobre dados

A versão atual usa `data/users.json` para simplificar a instalação. Em hospedagens com filesystem efêmero, cadastros podem não ser permanentes após reinicializações/redeploys. Para uso real, o próximo passo recomendado é migrar usuários e configurações para PostgreSQL.

## Discord

`discord-bot.js` é um serviço separado do site. Não altere o Start Command do site para executar o bot.
