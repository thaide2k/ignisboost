# 🚗 IgnisBoost

Um jogo de roubos de carros desenvolvido com React.

## 📋 Descrição

IgnisBoost é um jogo de ação e furtividade onde você assume o papel de um ladrão de carros profissional. Complete missões roubando carros em diferentes localidades da cidade, evite a polícia e ganhe dinheiro para subrir sua carreira no mundo do crime automotivo.

## 🎮 Como Jogar

### Controles
- **WASD** ou **Arrow Keys** - Mover o jogador
- **ESPAÇO** - Ação (iniciar minigame de furto)

### Gameplay
1. **Selecione um Contrato** - Escolha uma missão no menu de contratos
2. **Localize o Carro** - Navegue pela cidade até encontrar o carro alvo
3. **Furto do Carro** - Complete o minigame para roubar o carro
4. **Escape** - Leve o carro até o ponto de entrega antes que a polícia te pegue
5. **Repita** - Complete mais missões para ganhar dinheiro e subir de nível

### Sistema de Heat
- Cada missão aumenta seu nível de "heat" (busca)
- Se o heat ficar muito alto, a polícia será mais agressiva
- Missões bem-sucedidas reduzem o heat

### Contratos (Tier D → S)
- **Tier D**: Recompensa baixa, políciaeasy
- **Tier C**: Recompensa média, police moderate
- **Tier B**: Recompensa boa, policehard
- **Tier A/S**: Recompensa alta, polícia muito perigosa

### Minigames
O jogo possui dois minigames de furto:
1. **Hotwire** - Timing: Pressione ESPAÇO quando a barra verde estiver na zona correta
2. **PathFind** - Navegação: Clique nos nós em ordem do mais próximo ao mais longe

## 🗺️ Mapa da Cidade

O mapa é gerado proceduralmente com uma estrutura de quarteirões:
- Ruas cinzas = áreas transitáveis
- Prédios azuis escuros = obstáculos
- Estacionamentos = onde carros aparecem

## 🛠️ Tecnologias

- **React** - Framework principal
- **Vite** - Build tool
- **JavaScript** - Linguagem
- **CSS** - Estilização

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/thaide2k/ignisboost.git

# Entre no diretório
cd ignisboost

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## 👨‍💻 Desenvolvedor

**Thiago ThaiDe** - Desenvolvedor solo

## 📄 Licença

MIT License

---

*IgnisBoost - A fast-paced car theft game*
