# 🍃 Guia de Configuração Gratuita do MongoDB Atlas (Banco de Dados na Nuvem)

Este guia mostra como criar um banco de dados gratuito na nuvem para que as contas, moedas e inventários dos jogadores fiquem salvos para sempre.

---

### 1. Criar Conta no MongoDB Atlas
1. Acesse o site do MongoDB Atlas e crie uma conta gratuita.
2. Selecione o plano gratuito **M0 Free Cluster**.
3. Escolha a região da AWS em São Paulo ou Estados Unidos.

---

### 2. Criar Usuário do Banco de Dados
1. Em **Database Access**, clique em **Add New Database User**.
2. Escolha um nome de usuário e uma senha segura.
3. Defina as permissões como **Read and write to any database**.

---

### 3. Liberar Acesso de Rede (Network Access)
1. Em **Network Access**, clique em **Add IP Address**.
2. Clique em **Allow Access from Anywhere** (`0.0.0.0/0`).
3. Confirme.

---

### 4. Obter a String de Conexão (URI)
1. Em **Database**, clique no botão **Connect**.
2. Escolha **Drivers (Node.js)**.
3. Copie a string de conexão gerada. Ela terá este formato:
   `mongodb+srv://<usuario>:<senha>@cluster0.mongodb.net/scrambled_egg?retryWrites=true&w=majority`
4. Substitua `<usuario>` e `<senha>` pelos dados que você criou no Passo 2.

---

### 5. Como Usar
- **No computador (Local):** Crie um arquivo `.env` na pasta do jogo com a linha:
  `MONGODB_URI="sua_string_copiada"`
- **No Fly.io / Render:** Defina a variável de ambiente `MONGODB_URI` no painel de controle.

O jogo detectará o MongoDB Atlas automaticamente. Se o MongoDB não estiver conectado, o jogo continua funcionando normalmente usando o arquivo local `data/users.json`.
