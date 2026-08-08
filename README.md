# RNG Centro de Comando

Projeto completo do Centro de Comando RNG, com frontend em um único `public/index.html` (HTML + CSS + JavaScript) e backend Node.js.

## Estrutura

- `server.js` — servidor, autenticação, sessões, cargos, promoção e sincronização Discord.
- `public/index.html` — interface completa, CSS e JavaScript no mesmo arquivo.
- `data/users.json` — banco JSON criado automaticamente.
- `.env.example` — variáveis necessárias.
- `render.yaml` — configuração para Render.

## Cargos

- Proprietário
- Líder
- Treinador
- Aluno
- Membro

Novos cadastros entram como **Aluno**. Proprietário, Líder e Treinador podem gerenciar cargos conforme as regras do servidor.

## Rodar no Windows

1. Instale Node.js 20 ou superior.
2. Copie `.env.example` para `.env`.
3. Preencha `OWNER_EMAIL`, `INITIAL_OWNER_PASSWORD` e `SESSION_SECRET`.
4. Execute `npm install`.
5. Execute `npm start`.
6. Abra `http://localhost:3000`.

## Render

Configure as variáveis secretas indicadas no `render.yaml`. O endereço público fornecido pelo Render é o endereço que deve ser compartilhado com os usuários.

O armazenamento persistente é necessário para manter `data/users.json` entre reinicializações/redeploys.

## Discord

O bot pode enviar eventos para:

- `POST /api/sync/member`
- `POST /api/sync/penalty`

Use o mesmo valor de `SYNC_API_KEY` no servidor e no bot.

Nunca publique `.env` ou senhas reais.
