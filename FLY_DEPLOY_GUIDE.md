# 🚀 Guia de Publicação 24/7 no Fly.io (Servidor Online Permanente)

Este guia ensina como colocar o jogo **Scrambled Egg Showdown** online 24 horas por dia gratuitamente na nuvem do Fly.io.

---

### 1. Criar Conta e Instalar o Fly CLI
1. Acesse o site do Fly.io e crie uma conta gratuita.
2. Baixe o instalador do Fly CLI para o seu sistema operante.

---

### 2. Fazer Login no Terminal
No terminal do seu computador (PowerShell ou VS Code), execute:
```bash
fly auth login
```

---

### 3. Publicar o Jogo
Na pasta do jogo, execute:
```bash
fly launch
```
1. O Fly detectará o arquivo Dockerfile e fly.toml automaticamente.
2. Escolha um nome para a aplicação e a região de São Paulo (`gru`).

---

### 4. Conectar o MongoDB Atlas
Para salvar as contas permanentemente na nuvem:
```bash
fly secrets set MONGODB_URI="sua_string_de_conexao_mongodb"
```

---

### 5. Implantar
```bash
fly deploy
```

Pronto! Seu jogo estará no ar 24h por dia!
