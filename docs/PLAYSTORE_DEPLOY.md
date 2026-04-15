# Guia de Publicação - IgnisBoost na Google Play Store

## 1. Preparação do Projeto para Android

### 1.1 Converter Web App para App Android

O projeto atual é uma aplicação React web. Para publicar na Google Play, precisamos converter para app nativo usando **Capacitor** (recomendado) ou **Cordova**.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
```

### 1.2 Configurar Android Studio

- Baixar Android Studio: https://developer.android.com/studio
- Instalar SDK Android (API 34+)
- Configurar variáveis de ambiente

---

## 2. Conta Google Play Developer

### 2.1 Criar Conta

1. Acesse: https://play.google/console
2. Pague a taxa de registro: **US$ 25** (taxa única)
3. Complete as informações da conta

### 2.2 Informações Necessárias

- Nome de desenvolvedor (visível na loja)
- E-mail de contato
- Website com política de privacidade
- Conta bancária para receber pagamentos

---

## 3. Configuração no Google Play Console

### 3.1 Criar Novo App

1. Clique em **Criar app**
2. Preencha:
   - Nome do app: "IgnisBoost"
   - Idioma padrão: Português (BR)
   - Título curto: "IgnisBoost"
   - Categoria: Jogos > Ação

### 3.2 Abas Principais

| Aba | O que preencher |
|-----|-----------------|
| **Vitrine** | Título, descrição, ícones, capturas de tela |
| **Preços** | Grátis ou pago |
| **Países** | Selecionar países disponíveis |
| **Classificação** | Classificação indicativa |
| **Contenido do app** | Declarações de conteúdo |
| **Versões** | Upload doAAB/APK |

---

## 4. Assets required (Recursos Necessários)

### 4.1 Ícones

| Tipo | Tamanho | Formato |
|------|---------|---------|
| Ícone principal | 512x512 px | PNG |
| Ícone Adaptativo | 1024x1024 px | PNG |

### 4.2 Capturas de Tela

Mínimo 2, máximo 8:

| Dispositivo | Tamanho |
|-------------|---------|
| Telefone | 1080x1920 px |
| Tablet | 1800x1200 px |

### 4.3 Banner Promocional

- 1024x500 px (opcional)

### 4.4 Vídeo (opcional)

- YouTube ou Vimeo link

---

## 5. Processo de Build

### 5.1 Gerar APK/AAB

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

### 5.2 Assinar o App

- Criar keystore para assinatura
- Configurar no gradle
- Gerar AAB (Android App Bundle) - recomendado

---

## 6. Testes antes do Lanzamiento

### 6.1 Testes Internos

- Upload do app
- Adicionar testadores (até 100)
- Testar em dispositivos reais

### 6.2 Testes Fechados

- Grupo maior de testadores
- Colher feedback

### 6.3 Testes Abertos (Open Testing)

- Qualquer pessoa pode testar
- Versão quase pronta

---

## 7. Publicação Final

### 7.1 Checklist Pré-Publicação

- [ ] App testado em vários dispositivos
- [ ] Ícones e screenshots prontos
- [ ] Política de privacidade publicada
- [ ] Classificação indicativa concluída
- [ ] Descrição da loja completa
- [ ] AAB/APK preparado e assinado

### 7.2 Enviar para Revisão

1. Vá para **Versões > production**
2. Clique em **Criar nova versão**
3. Faça upload do AAB
4. Adicione notas de release
5. Clique em **Revisar > Enviar para revisão**

### 7.3 Tempo de Revisão

-通常: **1-7 dias**
- Pode levar mais se houver problemas

---

## 8. Após a Publicação

### 8.1 Monitoramento

- Acessar **Play Console > Painel**
- Ver downloads, avaliações, crashes

### 8.2 Atualizações

1. Fazer mudanças no código
2. Build nova versão
3. Upload no Play Console
4. Enviar para revisão

### 8.3 Métricas Importantes

- **Instalações**
- **Avaliações** (mantenha acima de 4 stars)
- **Crashes** (mantenha abaixo de 1%)
- **ANRs** (Application Not Responding)

---

## 9. Custos e Manutenção

| Item | Custo |
|------|-------|
| Conta Developer | US$ 25 (único) |
| Renovação anual | Grátis |
| Taxa por venda | 30% (Google) |
| Servidor | Variável |

---

## 10. Próximos Passos Recomendados

1. **Imediato**: Configurar Capacitor no projeto
2. **Curto prazo**: Criar conta Google Play Developer
3. **Médio prazo**: Preparar assets (ícones, screenshots)
4. **Longo prazo**: Planejar monetização (ads, IAP)

---

## Links Úteis

- Google Play Console: https://play.google/console
- Documentação Capacitor: https://capacitorjs.com
- Política de Privacidade modelo: https://termsfeed.com/blog/privacy-policy-template/
- Android Asset Studio: https://android-dot-latency.googleusercontent.com

---

*Documento criado em: 2026-04-13*
*Projeto: IgnisBoost*
*Versão: 1.0.0*