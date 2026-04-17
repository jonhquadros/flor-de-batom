# Flor de Batom - Guia de Implantação (Firebase para Netlify)

Este projeto é uma aplicação Next.js dinâmica que utiliza Firebase para banco de dados/autenticação e Genkit para Inteligência Artificial. Para manter as funcionalidades de servidor (SSR/Server Actions) na Netlify, siga os passos abaixo:

## 🚀 Passo a Passo para Implantação

### 1. Preparação do Repositório
- Certifique-se de que seu código está em um repositório Git (GitHub, GitLab ou Bitbucket).
- O arquivo `netlify.toml` já está configurado na raiz para gerenciar o build dinâmico.

### 2. Configuração na Netlify
1. Faça login na [Netlify](https://app.netlify.com/).
2. Clique em **"Add new site"** > **"Import an existing project"**.
3. Conecte seu provedor Git e selecione o repositório deste projeto.
4. Nas configurações de Build, a Netlify deve detectar automaticamente:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

### 3. Variáveis de Ambiente (CRUCIAL)
Sua aplicação depende de chaves externas para funcionar. Você deve configurá-las no painel da Netlify:
1. Vá em **Site configuration** > **Environment variables**.
2. Clique em **"Add a variable"** e adicione:
   - `GEMINI_API_KEY`: Sua chave da API do Google AI (para o Genkit).
   - Variáveis do Firebase (Copie os valores do seu arquivo `.env` ou do `src/firebase/config.ts`):
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4. Deploy
- Após configurar as variáveis, clique em **"Deploy site"**.
- A Netlify instalará o plugin `@netlify/plugin-nextjs` automaticamente para gerenciar as funções de servidor.

## 🛠️ Notas Técnicas
- **SSR & Server Actions:** Como removemos o `output: 'export'`, a aplicação não gera uma pasta `out`. Ela roda como uma aplicação Node.js dinâmica.
- **Segurança:** As regras de segurança do Firestore já estão configuradas para permitir acesso apenas via autenticação, que agora é sincronizada no `AdminLayout`.
