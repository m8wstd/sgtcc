# SGTCC — RF03 corrigida usando a base enviada em 13/11/2026

Esta alteração foi produzida a partir de `sgtcc-base-atual.zip` gerado por `git archive HEAD`. O patch não foi feito sobre a `main` de outro momento.

## O que mudou

- A sala da etapa e o painel do aluno deixam de simular versões e consultam o Firestore, o mesmo utilizado pelo orientador.
- O upload de PDF/DOCX (10 MB) usa `@vercel/blob/client` diretamente do navegador; a rota de token confirma autenticação, TCC e marco, sem revelar o token secreto.
- O navegador confirma o upload em uma segunda rota que valida o Blob via `head()` e grava uma versão no Firestore em transação. Esta confirmação funciona no `localhost`, onde o webhook do Blob não alcança o servidor.
- A consulta e o download são feitos por `/api/documentos/<ID>` e `/api/documentos/<ID>?download=1` após checagem de sessão e vínculo.
- O seed passa a criar PDFs de demonstração reais no Blob, em vez de registrar apenas caminhos de arquivos inexistentes.
- PDFs antigos registrados pelo seed como simples caminhos continuam na base, mas não são mais apresentados como uploads reais. Não foram apagados.
- O layout da sala e do painel foi preservado; foram alterados apenas dados, handlers e links, não o tema visual.

## Configuração da store (obrigatório)

No `.env.local`, confirme `BLOB_READ_WRITE_TOKEN` da MESMA store do projeto. O token não deve começar com `NEXT_PUBLIC_`.

Se a store do grupo é **pública**, use:

```
BLOB_ACCESS=public
NEXT_PUBLIC_BLOB_ACCESS=public
```

Se criou uma store **privada**, use:

```
BLOB_ACCESS=private
NEXT_PUBLIC_BLOB_ACCESS=private
```

**Atenção:** uma store pública não protege a URL original contra acesso externo. Mesmo que a aplicação exija sessão para acessar a sua rota, qualquer pessoa que possua a URL pública do objeto pode abri-la diretamente. Para privacidade acadêmica, migre para uma store privada. As duas stores não compartilham automaticamente os arquivos; `NOT_FOUND` pode indicar token da store errada.

## Aplicação no Windows

O patch foi construído para a versão EXATA do ZIP. Trabalhe a partir da branch cujo `HEAD` gerou o ZIP, com `git status` limpo.

```cmd
cd C:\Users\emy\sgtcc
git status
git switch -c feat/rf03-base-atual-corrigida
git apply --check "C:\Users\emy\Downloads\rf03-base-atual-corrigida.patch"
git apply "C:\Users\emy\Downloads\rf03-base-atual-corrigida.patch"
npm ci
npm test
npm run build
npm run dev
```

Se a branch de destino existir, escolha outro nome. Se `git apply --check` indicar erro, pare; **não** use `--reject` ou `--3way` sem revisar o resultado.

## Teste de ponta a ponta

1. Use um aluno realmente vinculado a um TCC com um marco que permita envio. Envie um PDF válido de poucos KB pela Sala da Etapa.
2. Confira a criação do arquivo na store Vercel Blob do projeto e um registro em `versoes_arquivo` com `arquivoUrl` HTTPS de Blob.
3. Recarregue a página (F5). O documento deve continuar no histórico; confirme também em `/dashboard/aluno/entregas`.
4. Entre como orientador vinculado ao TCC e abra a mesma etapa. Os documentos devem constar no histórico e abrir/baixar pelo ID da versão.
5. Acesse `/api/documentos/<id>` em sessão de outro aluno ou professor sem vínculo: deve retornar 403. Sem sessão: 401.
6. Envie outro documento no mesmo marco e confirme que vira v2 sem apagar a v1.
7. No caso de banca, a versão final só aparecerá após arquivo real cadastrado no marco `entrega-final`; PDFs fictícios antigos não contam.

## Diagnóstico somente leitura

```cmd
npx tsx scripts/diagnosticar-rf03.ts
```

Exibe registros de versão que não têm URL do Blob ou que `head()` não encontrou. O script NÃO exclui nem altera dados. Para documentos reais antigos, migre o arquivo manualmente antes de mudar o registro; não substitua um TCC real por um PDF gerado pelo seed.

## Limitações e observações

- `npm test` e `npm run build` devem ser executados no seu ambiente; não houve acesso às suas credenciais Firebase/Vercel neste ambiente de preparação.
- A RF04 (parecer/status do orientador) e RF06 (encaminhamento automático à banca) ainda têm outras interações demonstrativas no projeto. Esta correção foca persistência, histórico, visibilidade e leitura/download da RF03.
- Arquivos carregados diretamente e não confirmados (p. ex. se a aba fechar após o upload) podem ficar órfãos no Blob. Não aparecem como envio confirmado e precisam de limpeza administrativa futura.
- Não rode o `npm run seed` em um Firestore de produção ou compartilhado sem backup: o seed recria usuários e dados de demonstração.
- O `npm ci` pode exigir Node.js atualizado devido à versão do Firebase SDK; siga o requisito do pacote instalado.
