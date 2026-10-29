# 🍳 SCRAMBLED EGG SHOWDOWN 3.4 (DOOM-Style 2.5D Multiplayer)

Jogo de tiro multiplayer online 2.5D estilo DOOM clássico, totalmente em português, desenvolvido em **Node.js, WebSockets e Canvas HTML5**.

---

### 🌟 NOVIDADES DA VERSÃO 3.4 (Vestiário 3D, Loja de 20 Caixas & Patamar):

1. **🎁 Loja de 20 Caixas com Roleta CS:GO:**
   - 20 Caixas diferentes com 50 raridades de skins (*Comum, Raro, Épico, Lendário, Místico*).
   - **5 Caixas Sazonais** (Halloween 🎃, Natal 🎅, Páscoa 🐰, Valentine's 💖, Ano Novo 🎆) com selo de edição limitada (10 dias).
   - Animação de Roleta com giro horizontal e efeitos sonoros sincronizados.

2. **👔 Vestiário 3D Interativo:**
   - Aba exclusiva para visualizar o personagem em 3D/2.5D com rotação de 360° em tempo real.
   - Equipar **Chapéus**, **Camisas**, **Calças**, **Skins de Armas** e **Gritos Engraçados de Morte** (Grito do Bode 🐐, Pato de Borracha 🦆, Opereta 🎭, etc.).

3. **🏆 Sistema de Moedas & Patamar dos Melhores (Podium):**
   - Início com 0 moedas (acumuladas ao jogar partidas).
   - **Patamar dos Melhores:** 1º lugar ganha até **200 Moedas** por partida.
   - Jogadores fora do patamar ganham multiplicadores por Kills, Assistências e Vitória até o **máximo de 75 Moedas**.

4. **🏢 Mapas de 2 Andares & Céu Ensolarado:**
   - *A Empresa* e *A Mansão* contam com 2 andares funcionais conectados por elevadores/escadas.
   - Céu azul com nuvens fofas e carpetes coloridos nas bases.

5. **🎯 Controles Modernos:**
   - Trava de Mira no Mouse (Pointer Lock), Pulo (`Espaço`), Agachar (`Ctrl`/`C`), Correr (`Shift`).

---

### 🚀 Como Rodar no VS Code:

1. Extraia o projeto no seu computador e abra a pasta no VS Code.
2. Abra o terminal (`Ctrl + ~`) e rode:
   ```bash
   npm install
   npm start
   ```
3. Em um segundo terminal, abra a ponte para a internet com seus amigos:
   ```bash
   npx localtunnel --port 3000
   ```
4. Acesse `http://localhost:3000` no navegador!
