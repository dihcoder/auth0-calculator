# 🧮 Calculadora com Auth0 e Netlify Functions

Uma aplicação de calculadora moderna que demonstra integração entre frontend vanilla JavaScript, autenticação Auth0 e backend serverless com Netlify Functions em TypeScript.

## ✨ Características

- **Frontend**: Interface moderna e responsiva em vanilla JavaScript
- **Autenticação**: Integração completa com Auth0
- **Backend Serverless**: Netlify Functions em TypeScript
- **Controle de Acesso**: Operações básicas livres, avançadas requerem login
- **Responsivo**: Funciona perfeitamente em desktop e mobile

## 🔐 Controle de Acesso

- **Operações Livres**: Soma (+) e Subtração (-)
- **Operações Protegidas**: Multiplicação (×) e Divisão (÷) - requerem autenticação

## 🚀 Configuração

### 1. Configurar Auth0

1. Crie uma conta no [Auth0](https://auth0.com/)
2. Crie uma nova aplicação (Single Page Application)
3. Configure as URLs permitidas:
   - **Allowed Callback URLs**: `http://localhost:8888, https://seu-site.netlify.app`
   - **Allowed Logout URLs**: `http://localhost:8888, https://seu-site.netlify.app`
   - **Allowed Web Origins**: `http://localhost:8888, https://seu-site.netlify.app`

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
AUTH0_DOMAIN=seu-dominio.auth0.com
AUTH0_AUDIENCE=https://seu-dominio.auth0.com/api/v2/
```

### 3. Atualizar Configurações no Código

No arquivo `index.html`, atualize o objeto `AUTH0_CONFIG`:

```javascript
const AUTH0_CONFIG = {
    domain: 'seu-dominio.auth0.com',
    clientId: 'seu-client-id',
    redirectUri: window.location.origin
};
```

## 📦 Instalação

```bash
# Clonar o repositório
git clone <seu-repositorio>
cd calculadora-auth0-netlify

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Executar em desenvolvimento
npm run dev
```

## 🌐 Deploy no Netlify

### Deploy Automático

1. Faça push do código para um repositório Git
2. Conecte o repositório ao Netlify
3. Configure as variáveis de ambiente no dashboard do Netlify:
   - `AUTH0_DOMAIN`
   - `AUTH0_AUDIENCE`
4. Deploy automático será feito a cada push

### Deploy Manual

```bash
# Build e deploy
npm run build
npm run deploy
```

## 🛠️ Estrutura do Projeto

```
calculadora-auth0-netlify/
├── index.html                 # Frontend da aplicação
├── netlify/
│   └── functions/
│       └── calculate.ts       # Function para cálculos
├── package.json              # Dependências do projeto
├── netlify.toml             # Configuração do Netlify
├── tsconfig.json            # Configuração TypeScript  
├── .env.example             # Exemplo de variáveis de ambiente
└── README.md                # Este arquivo
```

## 🔧 Desenvolvimento

### Netlify Functions

As funções estão localizadas em `netlify/functions/` e são escritas em TypeScript.

**Endpoint**: `/.netlify/functions/calculate`

**Métodos**: POST

**Body**:
```json
{
  "a": 10,
  "b": 5,
  "operation": "+"
}
```

**Headers** (para operações protegidas):
```
Authorization: Bearer <jwt-token>
```

### Operações Suportadas

| Operação | Símbolo | Autenticação | Exemplo |
|----------|---------|--------------|---------|
| Soma | `+` | ❌ Não | `10 + 5 = 15` |
| Subtração | `-` | ❌ Não | `10 - 5 = 5` |
| Multiplicação | `*` | ✅ Sim | `10 × 5 = 50` |
| Divisão | `/` | ✅ Sim | `10 ÷ 5 = 2` |

## 🎨 Interface

- **Design Moderno**: Interface limpa com gradientes e sombras
- **Responsivo**: Adapta-se a diferentes tamanhos de tela
- **Interativo**: Animações suaves e feedback visual
- **Acessível**: Suporte a navegação por teclado

### Atalhos de Teclado

- **Números**: `0-9`
- **Operadores**: `+`, `-`, `*`, `/`
- **Calcular**: `Enter` ou `=`
- **Limpar**: `Escape`, `C` ou `c`
- **Apagar**: `Backspace`
- **Decimal**: `.`

## 🔒 Segurança

- **JWT Validation**: Tokens Auth0 são validados usando JWKS
- **CORS**: Configurado adequadamente para requisições cross-origin
- **Input Validation**: Validação rigorosa de entrada no backend
- **Error Handling**: Tratamento robusto de erros

## 🚨 Tratamento de Erros

A aplicação trata diversos tipos de erro:

- **Autenticação falhada**
- **Token inválido ou expirado**
- **Divisão por zero**
- **Entrada inválida**
- **Problemas de conectividade**

## 📱 Recursos Adicionais

- **Feedback Visual**: Mensagens de sucesso, erro e informação
- **Loading States**: Indicadores de carregamento durante cálculos
- **Histórico Visual**: Mostra a operação completa no resultado
- **Persistência de Estado**: Mantém resultado para operações encadeadas

## 🐛 Troubleshooting

### Problema: "Esta operação requer autenticação"

**Solução**: Faça login clicando no botão "Entrar"

### Problema: "Token inválido ou expirado"

**Solução**: Faça logout e login novamente

### Problema: Netlify Functions não funcionam localmente

**Solução**: 
1. Certifique-se de usar `netlify dev` ao invés de servidor local
2. Verifique se as variáveis de ambiente estão configuradas

### Problema: Auth0 não funciona

**Solução**:
1. Verifique se as URLs estão configuradas corretamente no Auth0
2. Confirme se domain e clientId estão corretos no código
3. Verifique se o site está sendo servido via HTTPS em produção

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📧 Contato

Se você tiver dúvidas ou sugestões, sinta-se à vontade para abrir uma issue ou entrar em contato.

---

Feito com ❤️ usando Auth0, Netlify Functions e muito TypeScript!