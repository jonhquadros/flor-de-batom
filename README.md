# flor-de-batom
# Flor de Batom - Guia de Implantação (Firebase para Netlify)

Este projeto é uma aplicação Next.js dinâmica que utiliza Firebase para banco de dados/autenticação e Genkit para Inteligência Artificial.

## 📁 Como levar para o Git (GitHub)

Siga estes passos para subir seu código pela primeira vez:

1. **Abra o terminal** na pasta do seu projeto e execute:
   ```bash
   # Inicializa o Git (se ainda não fez)
   git init

   # Adiciona todos os arquivos
   git add .

   # Cria o registro das alterações
   git commit -m "Commit: Estrutura completa Flor de Batom"

   # Define a branch principal
   git branch -M main

   # CONECTAR AO SEU REPOSITÓRIO
   # Se aparecer o erro "remote origin already exists", use este comando:
   git remote set-url origin https://github.com/jonhquadros/flor-de-batom.git
   
   # Se for a primeira vez e não houver remote, use:
   # git remote add origin https://github.com/jonhquadros/flor-de-batom.git

   # Envia os arquivos
   git push -u origin main
   ```

## 🚀 Implantação na Netlify

Após subir para o Git, siga os passos abaixo:

### 1. Configuração na Netlify
1. Faça login na [Netlify](https://app.netlify.com/).
2. Clique em **"Add new site"** > **"Import an existing project"**.
3. Conecte seu provedor Git e selecione o repositório `jonhquadros/flor-de-batom`.
4. Nas configurações de Build, a Netlify detectará automaticamente via `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

### 2. Variáveis de Ambiente (MUITO IMPORTANTE)
Sua aplicação precisa de chaves para funcionar. Adicione-as em **Site configuration** > **Environment variables**:
- `GEMINI_API_KEY`: Sua chave do Google AI.
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. Deploy
- Após configurar as variáveis, clique em **"Deploy site"**.
- A Netlify gerenciará o servidor dinâmico automaticamente.

## 🛠️ Notas Técnicas
- **SSR & Server Actions:** Mantido para permitir funções de servidor (IA e Estoque).
- **Segurança:** O painel administrativo exige login (flordebatom / gestaoflor@26).
- **Sincronização:** Utiliza transações do Firestore para garantir que o estoque nunca fique negativo em vendas simultâneas.