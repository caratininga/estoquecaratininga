# 📦 Sistema de Contagem de Estoque

Sistema web de gestão e controle de estoque com suporte a múltiplos locais, contagens semanais e diárias, relatórios de divergência e sincronização em nuvem via Firebase.

## 🚀 Funcionalidades

- **Contagens Semanais e Diárias** com herança inteligente de estoque anterior
- **Controle de Estoque** com cálculo automático de divergências (produto a produto)
- **Relatórios de Evolução Histórica** com métricas gráficas (Recharts)
- **Catálogo de Produtos** com preços por unidade e por localidade
- **Gerenciamento de Categorias** drag-and-drop
- **Importação/Exportação** de contagens e movimentações via planilha Excel (SheetJS)
- **Impressão otimizada** com Relatório Completo ou só Divergências
- **Filtro de produtos zerados** na visão de controle
- **Autenticação Firebase** com suporte a múltiplos usuários
- **Suporte a múltiplas lojas/locais**

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|------------|
| UI | React 18 (via CDN + Babel Standalone) |
| Estilos | Tailwind CSS (via CDN) |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Banco de Dados | Firebase Firestore |
| Auth | Firebase Authentication |
| Excel | SheetJS (xlsx) |

> Este projeto é 100% client-side sem build step. Basta um servidor web estático (ou Firebase Hosting).

## ⚙️ Como Configurar

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/contagem-estoque.git
cd contagem-estoque
```

### 2. Configure o Firebase

Edite o arquivo `index.html` e substitua os placeholders na seção `firebaseConfig`:

```js
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_AUTH_DOMAIN.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID",
    measurementId: "SEU_MEASUREMENT_ID"
};
```

### 3. Regras de Segurança do Firestore

Configure as regras do Firestore para exigir autenticação:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Rode localmente

```bash
npx http-server -p 8080 -c-1
```

Acesse: `http://localhost:8080`

## 📁 Estrutura de Arquivos

```
├── index.html              ← Página principal (contém CSS, React setup e componentes base)
├── icon.png                ← Ícone da aplicação
├── components/
│   ├── App.js              ← Componente raiz, lógica de estado global e Firebase
│   ├── EvolutionReport.js  ← Relatórios e gráficos históricos
│   ├── ProductCatalog.js   ← Catálogo de produtos e preços
│   ├── CategoryManager.js  ← Gerenciamento de categorias
│   ├── CreateCountModal.js ← Modal de criação de nova contagem
│   ├── AnalyzedProductsModal.js ← Modal de análise detalhada
│   ├── LoginModal.js       ← Autenticação
│   ├── ErrorBoundary.js    ← Tratamento de erros React
│   └── Buttons.js          ← Componentes de botão reutilizáveis
```

## 📊 Estrutura do Firestore

```
estoque/
  config          ← Configurações globais (categorias, etc.)
contagens/
  {locKey}_{DD}_{MM}              ← Contagem semanal (ex: tiangua_15_06)
  {locKey}_{DD}_{MM}_diaria       ← Contagem diária
```

## 🔒 Segurança

- A API Key do Firebase é pública por design (proteção real vem pelas Regras do Firestore)
- Configure as regras para aceitar apenas usuários autenticados
- Recomendado uso em repositório **privado** se os dados forem sensíveis

## 📝 Licença

MIT
