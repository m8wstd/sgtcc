# RF04 — Sinalização de status das entregas

## Escopo implementado

`PATCH /api/entregas/[entregaId]/status` permite ao orientador atualmente
vinculado ao TCC executar estas transições:

| Status persistido | Ação | Novo status |
| --- | --- | --- |
| `PRONTA_PARA_REVISAO` | `INICIAR_REVISAO` | `EM_REVISAO` |
| `EM_REVISAO` | `SOLICITAR_CORRECAO` | `SOLICITADA_CORRECAO` |
| `EM_REVISAO` | `CONCLUIR` | `CONCLUIDA` |

Solicitar correção exige comentário não vazio, aparado e limitado a 4.000
caracteres. A entrega e o novo documento de `feedbacks` são gravados na mesma
transação. Versões e feedbacks existentes são somente lidos e preservados.
Nenhum campo ou coleção do esquema persistido foi adicionado, e a RF04 não
altera `TCC.statusGeral` nem `dataSubmissao`.

A API valida sessão com revogação, origem/CSRF, perfil persistido e vínculo do
orientador. Compara a revisão esperada com o `updateTime` integral do Firestore
(segundos e nanossegundos). A transação relê entrega, TCC, perfis, marco e
versões; alterações concorrentes são reavaliadas pelo Firestore e revisões
obsoletas retornam conflito `409`.

## Dependência da RF03

RF03 é responsável por criar e finalizar o upload, persistir a versão confirmada
e definir `PRONTA_PARA_REVISAO`. A RF04 não implementa upload, não sinaliza o
envio pelo aluno e não modifica handlers ou serviços da RF03.

Esta base ainda não contém um confirmador de upload RF03. Por segurança, a
implementação atual de `ConfirmadorSubmissao` responde `503 RF03_NOT_INTEGRATED`;
assim, `INICIAR_REVISAO`, `SOLICITAR_CORRECAO` e `CONCLUIR` ficam bloqueadas até
a integração real. Uma URL ou metadados de versão, isoladamente, não confirmam
que o objeto foi enviado. O confirmador a ser fornecido pela RF03 deve ser
somente leitura, idempotente e vincular a versão persistida ao objeto real e
imutável no Storage. Nenhum sinalizador de teste ou fallback de dados habilita
as ações em produção.

Antes de liberar o fluxo, as equipes devem confirmar que RF03:

1. Define `PRONTA_PARA_REVISAO` somente após concluir o upload e persistir a
   versão correspondente.
2. Fornece uma confirmação verificável da versão mais recente, ligada ao TCC,
   entrega e objeto imutável do Storage.
3. Não atualiza a entrega durante a publicação da versão, preservando o
   `updateTime` que controla conflitos da RF04.
4. Usa identificador e número de versão únicos e crescentes, e data de upload
   definida pelo servidor.

Após o acordo, a integração deve substituir somente o adaptador padrão em
`src/lib/entregas/submission.ts`. Não requer mudança no esquema do banco.

## Endpoint

Corpo aceito:

```json
{
  "acao": "SOLICITAR_CORRECAO",
  "revisaoEsperada": "1793635200:123456789",
  "comentario": "Descreva os ajustes necessários."
}
```

Para `INICIAR_REVISAO` e `CONCLUIR`, omita `comentario`. Campos extras,
identidade, perfil e destino de status são rejeitados. A chamada exige o cookie
de sessão, origem permitida e token CSRF no cookie e em `X-CSRF-Token`. As
respostas usam `Cache-Control: no-store`.

## Validação

Os testes RF04 ficam em `src/lib/entregas/*.test.ts`. Eles cobrem transições,
autorização do orientador atual, revisão obsoleta, confirmação ausente,
comentário obrigatório, validação de entrada e respostas da API. A integração
com upload real e a concorrência entre instâncias do Firestore dependem da
confirmação/ambiente fornecidos pela RF03; nenhum serviço de produção é usado.
