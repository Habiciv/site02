RNG — Sistema de Provas com cargos e banco de dados

INICIAR O SISTEMA:
1. Instale o Node.js 22 ou superior.
2. Abra a pasta do projeto em um terminal e execute: node server.js
3. Acesse http://localhost:3000 no navegador. Não abra mais o index.html diretamente.

O arquivo rng-provas.db é criado automaticamente na pasta do projeto. Ele centraliza nomes, e-mails, logins e cargos. Para que pessoas em dispositivos diferentes usem o mesmo banco, publique esta pasta em uma hospedagem que suporte Node.js e defina a porta disponibilizada pela hospedagem.

REGISTRO DE CONTAS:
- Toda conta criada no cadastro é registrada com nome e e-mail.
- Ao abrir o sistema, as contas existentes recebem automaticamente o cargo MEMBRO caso não tenham cargo (backfill). Cargos inválidos também são convertidos para MEMBRO.
- Todo login é registrado com data/hora do último login e contador de logins.
- A aba Gestão de Cargos mostra todas as contas identificadas, mesmo que ainda não tenham feito login depois do cadastro.
- Treinador e Dono podem selecionar qualquer conta da lista para aplicar cargo, respeitando as permissões:
  * Treinador -> somente Treinador.
  * Dono -> Membro, Treinador ou Dono.
- Membros não conseguem alterar o próprio cargo.
- Dono Principal: lf1105111@gmail.com. Esse e-mail sempre é DONO, inclusive se for cadastrado pela primeira vez.

RESULTADOS E PROVAS:
- Somente Treinador/Dono veem resultados.
- É possível apagar uma prova e seus resultados pela área de resultados.
- Cada membro faz uma prova uma vez, salvo liberação de nova tentativa.
- Provas têm 10 questões e respostas A/B/C/D definidas por Treinador/Dono.

COMO USAR OS CARGOS:
1. Cadastros novos entram como MEMBRO automaticamente.
2. Entre com a conta do Dono Principal. Donos podem atribuir MEMBRO, TREINADOR ou DONO em Gestão de Cargos.
3. TREINADORES só podem conceder TREINADOR e não podem alterar um DONO.
4. MEMBROS não veem nem acessam as áreas restritas.

MIGRAÇÃO E LIMITES:
- Na primeira abertura pelo servidor, contas deste navegador que já estavam salvas localmente são incluídas no banco.
- Contas que só existem no localStorage de outros computadores/celulares não podem ser coletadas automaticamente; é necessário abrir o site uma vez nesses dispositivos para migrá-las ou pedir que essas pessoas façam login/cadastro novamente.
- Provas e resultados continuam preservados no armazenamento local da versão original. O banco novo centraliza os usuários, logins e cargos.
