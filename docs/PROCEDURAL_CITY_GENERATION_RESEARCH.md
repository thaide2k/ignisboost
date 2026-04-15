# Relatório Técnico: Técnicas de Geração Procedural Urbana para Simulação de Cidades Metropolitanas

## Sumário Executivo

Este relatório apresenta uma análise comparativa de abordagens para geração procedural de mapas urbanos realista, com foco na simulação de características de cidades metropolitanas. A pesquisa identificou cinco abordagens principais que representam o estado da arte em 2024-2025, cada uma com características distintas de viabilidade, complexidade e aplicabilidade.

---

## 1. Introdução e Contexto

A geração procedural de cidades/metrópoles representa um campo de pesquisa multidisciplinar situado na interseção entre computação gráfica, planejamento urbano, aprendizado de máquina e sistemas de informação geográfica. O crescente interesse em simulações urbanas para treinamento de agentes autônomos (veículos autônomos, robôs de entrega, drones) impulsionou avanços significativos nesta área nos últimos anos [1].

O desafio fundamental reside em equilibrar três dimensões conflitantes: **diversidade** (variedade de configurações urbanas), **controlabilidade** (capacidade de direcionar o geração para requisitos específicos) e **fidelidade** (realismo das cenas geradas). A literatura técnica demonstra que métodos existentes frequentemente sacrificam uma ou mais dessas dimensões [1].

---

## 2. Metodologia de Pesquisa

A pesquisa foi conduzida utilizando buscas sistemáticas em bases de dados acadêmicas (arXiv, IEEE, Springer) e documentação técnica de ferramentas comerciais. Os critérios de avaliação incluem:

- **Viabilidade técnica**: Complexidade de implementação e requisitos de infraestrutura
- **Esforço de implementação**: Tempo estimado para integração em projeto existente
- **Limitações**: Restrições e desvantagens de cada abordagem
- **Fontes**: Confiabilidade das referências identificadas

---

## 3. Abordagens Identificadas

### 3.1 Abordagem 1: Geração Procedural Baseada em Agentes (CityX)

**Descrição**: Sistema de geração de conteúdo procedural (PCG) que utiliza múltiplos agentes especializados para coordenar a criação de cidades 3D ilimitadas. O sistema aceita instruções multimodais incluindo dados OSM, mapas semânticos e imagens de satélite [1].

**Técnicas Principais**:
- **L-systems**: Algoritmo recursivo para simulação de estruturas de edifícios, similar ao crescimento de plantas [1]
- **Noise functions (Perlin Noise)**: Geração de formas orgânicas e padrões variáveis [1]
- **Multi-agent framework**: Coordenação de plugins PCG especializados através de programas executáveis

**Integração de Dados Reais**:
- OpenStreetMap (OSM) para malha viária e footprints de edifícios
- Imagens de satélite para contexto semântico
- Mapas de uso do solo para zoneamento

**Requisitos Técnicos**:
- Backend Python/PyTorch
- Biblioteca de assets 3D diversificada
- APIs de map services (OSM, Google Maps, etc.)

**Limitações**:
- Requer conhecimento significativo em desenvolvimento de plugins PCG
- Curva de aprendizado íngreme para customização
- Dependência de assets de alta qualidade

**Estimativa de Esforço**: 6-12 meses para equipe de 3-5 desenvolvedores

---

### 3.2 Abordagem 2: Layout Hierárquico Sensível ao Contexto (COHO)

**Descrição**: Método de geração de layout urbano em escala de cidade utilizando Graph-based Masked Autoencoder (GMAE). Captura semantics multi-camada incluindo edifícios, quadras, comunidades e cidades [2].

**Técnicas Principais**:
- **GMAE (Graph-based Masked Autoencoder)**: Codificação auto-supervisionada de estruturas graph hierárquicas [2]
- **Scheduled iterative sampling**: Geração priorizada de elementos urbanos importantes [2]
- **Canonical graph representation**: Representação unificada de todo o contexto urbano

**Abordagem de Densidade e Zoneamento**:
- Modelagem explícita de neighborhoods e comunidades
- Consideração de dependências entre níveis hierárquicos
- Geração baseada em prioridade semântica

**Requisitos Técnicos**:
- Framework de deep learning (PyTorch/TensorFlow)
- Dados de treinamento de 330 cidades americanas
- GPU para treinamento (mínimo 8GB VRAM)

**Limitações**:
- Treinamento requer dataset extenso e diversificado
- Estilo arquitetônico limitado às regiões de treinamento
- Generalização para cidades fora do domínio training pode ser problemática

**Estimativa de Esforço**: 4-8 meses para modelo base + 2-3 meses para fine-tuning

---

### 3.3 Abordagem 3: Integração de Dados Geoespaciais Abertos (VoxCity)

**Descrição**: Framework open-source Python para geração de modelos urbanos baseados em voxels, integrando dados geoespaciais globais gratuitamente disponíveis [3].

**Técnicas Principais**:
- **Voxelization**: Conversão de buildings, trees, land cover e terrain em voxels [3]
- **Open data integration**: Download automático de dados de altura de edifícios, canopy de árvores, uso do solo e elevação [3]
- **Environmental simulation**: Análise de radiação solar, sky view index, green view index [3]

**Fontes de Dados Utilizadas**:
| Fonte | Dados | Resolução |
|-------|-------|------------|
| Microsoft Building Height | Altura de edifícios | 4m |
| Global Canopy Height | Altura de vegetação | 1m |
| ESA World Cover | Uso do solo | 10m |
| MERIT Hydro | Elevação | ~90m |

**Requisitos Técnicos**:
- Python 3.8+
- Bibliotecas: rasterio, geopandas, scipy
- 16GB RAM mínimo para processamento de áreas metropolitanas

**Limitações**:
- Resolução limitada para detalhes urbanos finos
- Cobertura de dados variável por região geográfica
- Formato voxel pode não ser adequado para todos os casos de uso

**Estimativa de Esforço**: 2-4 meses para integração completa

---

### 3.4 Abordagem 4: Regras Procedurais (ArcGIS CityEngine CGA)

**Descrição**: Sistema comercial baseado em Computer-Generated Architecture (CGA) para modelagem procedural de cidades. Utiliza regras declarativas para gerar edifícios 3D detalhados a partir de footprints 2D [4].

**Técnicas Principais**:
- **CGA Shape Grammar**: Linguagem declarativa para especificação de regras de geração [4]
- **Split Grammars**: Decomposição recursiva de formas espaciais [5]
- **Asset-based modeling**: Uso de bibliotecas de componentes arquitetônicos

**Fluxo de Trabalho**:
1. Extração de dados de OSM (footprints, streets)
2. Aplicação de regras CGA para geração 3D
3. Estilização (schematic, realistic facades)
4. Export para formatos padrão (CityGML, glTF)

**Requisitos Técnicos**:
- ArcGIS CityEngine (licença comercial)
- Dados OSM ou GIS vectoriais
- Conhecimento de linguagem CGA

**Limitações**:
- Custo de licença (~$1.500/ano)
- Regras requerem expertise especializado
- Menos flexível que abordagens learning-based

**Estimativa de Esforço**: 2-3 meses para setup + desenvolvimento de regras customizadas

---

### 3.5 Abordagem 5: GANs Condicionais para Geração de Layout

**Descrição**: Utilização de Generative Adversarial Networks condicionais para geração de mapas de figure-ground ( footprints de edifícios) a partir de redes de streets [6].

**Técnicas Principais**:
- **pix2pix architecture**: Tradução imagem-para-imagem (input: street network, output: buildings) [6]
- **cGAN (conditional GAN)**: Aprendizado de distribuição condicional
- **Domain adaptation**: Transfer de estilos entre regiões urbanas

**Vantagens**:
- Geração rápida após treinamento
-output compatíveis com ferramentas de modelagem 3D
- Possibilidade de controlar densidade e estilo via conditioning

**Requisitos Técnicos**:
- Dataset pareado (street maps + building footprints)
- GPU para treinamento (mínimo 16GB VRAM para modelos de alta resolução)
- Pipeline de pós-processamento para refinamento

**Limitações**:
- Qualidade dependente da qualidade do dataset de training
- Dificuldade em garantir consistência em larga escala
- Requer dataset de treinamento específico para cada estilo urbano

**Estimativa de Esforço**: 3-5 meses para treinamento + integração

---

## 4. Análise Comparativa

| Critério | CityX | COHO | VoxCity | CityEngine | cGAN |
|----------|-------|------|---------|------------|------|
| **Controlabilidade** | Alta | Média | Alta | Alta | Média |
| **Diversidade** | Alta | Alta | Média | Alta | Média |
| **Fidelidade** | Alta | Alta | Média | Alta | Média |
| **Curva de aprendizado** | Alta | Alta | Baixa | Média | Alta |
| **Custo** | Baixo | Baixo | Baixo | Alto | Baixo |
| **Tempo para MVP** | 6 meses | 4 meses | 2 meses | 2 meses | 3 meses |

---

## 5. Técnicas de Visualização 3D

### 5.1 Stack Tecnológico Recomendado

Para implementação web-based, a combinação mais madura e amplamente suportada inclui:

**Three.js + WebGL**:
- Biblioteca mais madura para renderização 3D web
- Suporte universal em browsers modernos
- Ecossistema extenso de plugins e exemplos [7]

**Cesium**:
- Engine de globos virtuais baseado em WebGL
- Suporte nativo para dados geoespaciais (3D Tiles, KML, glTF)
- Excelente para visualização de cidades em escala [8]

### 5.2 Otimizações de Performance

Conforme orientado por especialistas da indústria [7]:

| Técnica | Impacto | Implementação |
|--------|---------|----------------|
| Geometry Merging | Reduz draw calls em até 80% | BufferGeometryUtils.mergeGeometries |
| Texture Atlasing | Reduz memória VRAM | Pack múltiplas texturas em atlas único |
| Instanced Rendering | Para objetos repetitivos | THREE.InstancedMesh |
| Level of Detail (LOD) | Adapta complexidade por distância | Múltiplas resoluções por objeto |
| Shadow baking | Remove runtime shadow calculation | Precomputed lightmaps |

---

## 6. Fontes Confiáveis Identificadas

### Acadêmicas
1. **CityX** (arXiv:2407.17572) - Universidade Chinesa de Ciências, 2024
2. **COHO** (arXiv:2407.11294) - Purdue University, 2024
3. **VoxCity** (arXiv:2504.13934) - National University of Singapore, 2025
4. **Procedural Modeling of Urban Land Use** (arXiv:2510.15877)
5. **Automatic 3D Building Model Generation** (MDPI:2023) - Universidade de Ljubljana

### Documentação Técnica
6. **ArcGIS CityEngine Documentation** - Esri
7. **3DCityDB Web Map Client** - Open source geoinformatics
8. **Three.js Performance Guide** - Simplified Media

### Ferramentas e Recursos
9. **OpenStreetMap** - Dados urbanos abertos globalmente
10. **Microsoft Building Footprints** - Alturas de edifícios 4m resolution
11. **ESA World Cover** - Classificação de uso do solo 10m

---

## 7. Recomendações para o Projeto IgnisBoost

### Cenário 1: MVP Rápido (2-3 meses)
- Utilizar VoxCity para geração de base
- Integrar com Three.js para visualização
- Limitar escopo a área urbana específica

### Cenário 2: Simulação Avançada (6-9 meses)
- Combinar VoxCity (dados) + regras CGA (detalhamento)
- Implementar customização de zoneamento
- Adicionar suporte para OSM em tempo real

### Cenário 3: Pesquisa/State-of-the-art (12+ meses)
- Desenvolver modelo customizado base COHO
- Treinar com dados brasileiros específicos
- Integrar com simulação de tráfego e agentes

---

## 8. Conclusão

A geração procedural de cidades realistas é um campo ativo de pesquisa com múltiplas abordagens viáveis. Para o contexto de um jogo mobile como IgnisBoost, a recomendação primária seria:

1. **Curto prazo**: VoxCity + Three.js para proof-of-concept
2. **Médio prazo**: Integração de regras procedural para detalhamento
3. **Longo prazo**: Considerar modelo deep learning customizado

A escolha final deve considerar os recursos disponíveis da equipe, timeline do projeto e requisitos específicos de fidelidade e controle.

---

## Referências

[1] Zhou, M. et al. (2024). CityX: Controllable Procedural Content Generation for Unbounded 3D Cities. arXiv:2407.17572

[2] Chen, H. & Aliaga, D. (2024). COHO: Context-Sensitive City-Scale Hierarchical Urban Layout Generation. arXiv:2407.11294

[3] Tsurumi, R. et al. (2025). VoxCity: A Seamless Framework for Open Geospatial Data Integration. arXiv:2504.13934

[4] Esri. (2024). ArcGIS CityEngine Documentation. https://www.esri.com

[5] Lienhard, J. & Pullar, D. (2024). Learning to sculpt neural cityscapes. Springer Computers & Graphics

[6] Wu, L. & Biljecki, F. (2023). Towards a Deep Automatic Generation of Figure-ground Maps. ISPRS Annals

[7] Simplified Media. (2024). WebGL and Three.js: Building 3D Web Experiences That Actually Perform.

[8] 3DCityDB. (2024). 3D Web Map Client Documentation.

---

*Documento elaborado em: 2026-04-13*
*Projeto: IgnisBoost - Pesquisa Técnica*
*Versão: 1.0*