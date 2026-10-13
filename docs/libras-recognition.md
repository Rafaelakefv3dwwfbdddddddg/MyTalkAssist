# Reconhecimento de Libras: estado e integração

## Decisão

O TalkAssist não inclui pesos de reconhecimento nem apresenta predições como tradução. O subconjunto `MALTA_LIBRAS` é um conjunto de exemplos para treinamento, não um modelo executável. A tela continua informando indisponibilidade até uma implementação local licenciada ser integrada e validada.

O contrato preparado em `src/services/LibrasRecognitionService.ts` aceita sequências temporais de frames RGB, exige metadados de licença/atribuição e só pode retornar um **candidato experimental de sinal isolado**. Não converte sinais em frases. O serviço padrão não tem adaptador, por isso sempre retorna indisponível.

## Auditoria dos dados

| Recurso | Evidência verificada | Consequência |
| --- | --- | --- |
| `MALTA_LIBRAS` | O card no Hugging Face declara MIT e descreve um subconjunto derivado do MINDS-Libras. A árvore pública consultada tinha 145 arquivos em 19 classes, com 4 a 15 exemplos por classe; a classe `Cinco` não estava presente. | Não é um conjunto equilibrado nem contém as 20 classes anunciadas na fonte. Não serve para alegar cobertura geral. |
| Arquivo `.pt` amostrado | O caminho Git LFS contém um ponteiro de 132 bytes para um objeto de 4.817.764 bytes. Carregado com `torch.load(..., weights_only=True)`, o objeto é um tensor RGB `uint8` com forma `[3, 32, 224, 224]` (Canais × Tempo × Altura × Largura). | É uma sequência de 32 frames RGB pré-processada, não pesos de modelo nem landmarks. É possível ler a amostra com PyTorch, mas o repositório não fornece modelo, definição do pré-processamento/inferência nem transformação reproduzível de câmera para esse tensor. |
| MINDS-Libras original | O registro Zenodo declara CC BY 4.0, 20 sinais, até 5 repetições por 12 sinalizadores e gravações ausentes em algumas combinações. O dataset RGB-D contém dados de corpo e face por frame. | A licença permite uso comercial com atribuição; a cobertura não é uniforme. Devem ser respeitados os termos da licença e a atribuição da fonte. |
| LIBRAS-EQT-UECE | Registro Zenodo declara CC BY-NC 4.0 e 45,4 GB de arquivos RGB, sequências processadas e landmarks. | Não usar no TalkAssist distribuível comercialmente. Pode ser avaliado em pesquisa não comercial separada. |
| SpellNet Libras | O card descreve classificação de letras estáticas para datilologia, relata 90% em validação própria e diz que não serve para sinais contínuos. Não foi encontrada licença explícita para os pesos. | Excluído: escopo inadequado para frases e direitos de redistribuição não confirmados. |

O `MALTA_LIBRAS` declara MIT no metadado do card, mas não foi encontrado um arquivo de licença separado na raiz, e o corpus completo agrega fontes distintas (UFSC, UFV, USP, YouTube, entre outras). A amostra MINDS pode ser estudada conforme a licença CC BY 4.0 da fonte original, com atribuição; qualquer pacote/modelo derivado ainda precisa registrar a proveniência e confirmar os direitos sobre o material dos sinalizadores antes de ser distribuído. Não baixar nem incorporar o corpus completo como se uma única licença resolvesse todas as fontes.

## Compatibilidade e privacidade

O Expo SDK 57 `CameraView` entrega prévia e captura de foto/vídeo, mas não expõe um callback de frames para inferência. `takePictureAsync` cria mídia temporária no cache; não é adequado para reconhecimento contínuo sem um mecanismo que processe em memória e comprove a liberação de cada frame. Além disso, o tensor MALTA exige exatamente 32 frames RGB 224×224 em layout CTHW; a política de amostragem temporal e o pré-processamento que originaram esses tensores não estão documentados no card e precisam ser reproduzidos/validados antes do treino ou inferência.

Para inferência local, falta um adaptador de câmera que forneça 32 frames RGB em memória sem persistir imagens: uma implementação Android nativa e outra Web/Electron. Cada modelo precisa vir com arquivo de pesos, pré-processador documentado, classes e ordem de labels, licença do código/modelo/dados, atribuição, divisão de treino/teste por sinalizador e limiar calibrado. O adaptador deve falhar para “não reconhecido” em baixa confiança.

No Web, o estado só passa a **Câmera ligada** depois de `CameraView.onCameraReady`; uma resposta de permissão positiva, por si só, não comprova que o stream iniciou. `onMountError` continua sendo o fallback para ausência de câmera ou permissão negada. Nenhuma imagem é armazenada pelo fluxo existente.

## Próximos critérios

1. Confirmar e registrar direitos de distribuição do corpus e dos dados dos sinalizadores.
2. Obter ou treinar um modelo temporal limitado a classes isoladas e medir resultado em sinalizadores não vistos.
3. Implementar captura de landmarks local em Android e Web/Electron, sem escrita de imagens/vídeos.
4. Converter somente previsões acima de um limiar calibrado em rascunho editável; confirmação humana antes de falar ou enviar.
5. Testar exemplos reais em aparelhos Android e Windows e avaliar falsos reconhecimentos com pessoas fluentes em Libras.
6. Manter tradução português→Libras indisponível até uma integração cujo fluxo, rede, licença e qualidade possam ser verificados. A suíte VLibras é uma alternativa remota gratuita/aberta para avaliação futura, mas exige internet e produz tradução automática; não é tradução humana validada.