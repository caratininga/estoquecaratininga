# Sistema de Gestão de Estoque Multilojas

Este é um sistema web front-end desenvolvido em React (via CDN) para gerenciar contagens de estoque físico em múltiplas lojas. Ele conta com persistência de dados local, exportação de planilhas e análises avançadas de acurácia.

## Funcionalidades
- **Gestão Multilojas:** Controle separado por filial.
- **Relatório de Evolução:** Gráficos interativos (Recharts) que demonstram acurácia diária, produtos divergentes e unidades perdidas/sobrando.
- **Lista Analítica Avançada:** Filtro, pesquisa e organização dinâmica dos dados de acurácia.
- **Suporte Offline-First:** Persistência no armazenamento local do navegador e integração com Firebase.
- **Exportação Excel:** Gera relatórios detalhados com os dados atuais.

## Como usar
Basta abrir o arquivo `index.html` em qualquer navegador moderno. Não é necessário rodar um servidor node, pois o React, Tailwind e Recharts estão sendo importados via CDN.
