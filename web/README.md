# D'SignerTV Auth + Trial (Firebase)

Este pacote inclui:
- Login/Registro (Web, Firebase Auth)
- Trial de 10 dias (Firestore + Cloud Functions)
- Flags de conta suspeita (e-mail não verificado / domínio descartável)
- Regras seguras (Firestore/Storage)
- Firebase Hosting pronto

## Como usar

1. Instale as ferramentas do Firebase:
   ```bash
   npm i -g firebase-tools
   firebase login
   ```

2. Na raiz do projeto (esta pasta), inicialize e selecione seu projeto **digital-dsigner**:
   ```bash
   firebase use --add
   # escolha digital-dsigner
   ```

3. Deploy das regras e hosting:
   ```bash
   firebase deploy --only hosting,firestore:rules,storage:rules
   ```

4. Deploy das Functions (Node 18):
   ```bash
   cd functions
   npm i
   cd ..
   firebase deploy --only functions
   ```

5. Ative Authentication (Email/Senha) e adicione o domínio do Hosting em **Authentication → Domínios autorizados**.

6. Acesse o site hospedado. Faça cadastro → verifique e-mail → login.
