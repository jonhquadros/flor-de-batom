# flor-de-batom
# Flor de Batom - Guia de Implantação (Firebase para Netlify)

Este projeto é uma aplicação Next.js dinâmica que utiliza Firebase para banco de dados/autenticação e Genkit para Inteligência Artificial.

## 📁 Como levar para o Git (GitHub)

Siga estes passos para subir seu código pela primeira vez:

1. **Crie um repositório vazio** no [GitHub](https://github.com/new).
2. **Abra o terminal** na pasta do seu projeto e execute:
   ```bash
   # Inicializa o Git
   git init

   # Adiciona todos os arquivos (exceto os ignorados no .gitignore)
   git add .

   # Cria o primeiro registro das alterações
   git commit -m "Primeiro commit: Estrutura completa com Faturamento e Genkit"

   # Define o nome da branch principal
   git branch -M main

   # Conecta ao seu repositório remoto (Substitua pela sua URL)
   git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git

   # Envia os arquivos
   git push -u origin main
   ```

## 🚀 Implantação na Netlify

Após subir para o Git, siga os passos abaixo:

### 1. Configuração na Netlify
1. Faça login na [Netlify](https://app.netlify.com/).
2. Clique em **"Add new site"** > **"Import an existing project"**.
3. Conecte seu provedor Git e selecione o repositório deste projeto.
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
- **SSR & Server Actions:** Removido o `output: 'export'` para permitir funções de servidor (IA e Estoque).
- **Segurança:** O painel administrativo exige login (flordebatom / gestaoflor@26) e sincroniza a sessão com o Firebase antes de liberar o acesso aos dados.# flor-de-batom
# flor-de-batom
