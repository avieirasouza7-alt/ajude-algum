# Recuperação do Ajude Alguém Online

Backup de referência criado em **19/07/2026**.

- Repositório: `https://github.com/avieirasouza7-alt/ajude-algum`
- Branch: `backup/2026-07-19-site-e-jogo`
- Tag fixa: `backup-2026-07-19`
- Commit: `b66f587`

## Recuperar em outro computador

1. Instale Git e Node.js.
2. Abra um terminal e execute:

```bash
git clone https://github.com/avieirasouza7-alt/ajude-algum.git
cd ajude-algum
git checkout backup-2026-07-19
npm install
```

3. Reponha as variáveis de ambiente usando os valores guardados com segurança no provedor de hospedagem/Supabase. Nunca copie senhas ou chaves secretas para este arquivo.
4. Para testar localmente, execute `npm run dev`.
5. Para gerar a versão de produção, execute `npm run build`.

## Restaurar esse backup como versão principal

Antes de alterar `main`, peça ao assistente do Cursor para conferir o repositório e preservar a versão atual. Depois, solicite:

> Restaure o site e o Jogo Jardim da Esperança usando a tag `backup-2026-07-19`, seguindo `RECUPERAR_SITE_E_JOGO.md`.

Não force o envio para `main` sem revisar as diferenças.

## Importante sobre os dados

Este backup no GitHub protege o **código do site, do jogo e as migrations do banco**. Ele não contém necessariamente:

- dados vivos do Supabase (perfis, campanhas, comentários, corações e mensagens);
- arquivos enviados ao Supabase Storage;
- variáveis de ambiente, senhas ou chaves privadas;
- configurações mantidas somente nos painéis de Supabase, Cloudflare ou outros serviços.

Para recuperação completa, mantenha também backups/exportações periódicas do banco e do Storage no Supabase, além de acesso seguro às contas do GitHub, Supabase e Cloudflare.
