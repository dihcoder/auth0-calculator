const API_URL = '/.netlify/functions/calculate';
const AUTH0_AUDIENCE_URL = 'https://auth0-calculator.netlify.app/';

// Auth0 Configuration (substitua pelos seus valores)
const auth0Client = new auth0.Auth0Client({
    domain: 'dev-uddg6jbjtj3w6kbp.us.auth0.com',
    clientId: 'SmiY9TAFSH7YUDiUy7k0Z6CJKFW2HP2K',
    authorizationParams: {
        redirect_uri: window.location.origin
    }
});

// Estado da calculadora
let currentInput = '0';
let operator = null;
let previousInput = null;
let isAuthenticated = false;
let user = null;

// Elementos DOM
const display = document.getElementById('display');
const userInfo = document.getElementById('userInfo');
const authButtons = document.getElementById('authButtons');
const loginBtn = document.getElementById('loginBtn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const divideBtn = document.getElementById('divideBtn');
const multiplyBtn = document.getElementById('multiplyBtn');
const notification = document.getElementById('notification');

// Inicialização
async function init() {
    try {
        // Verificar se há callback de autenticação
        const query = window.location.search;
        if (query.includes('code=') && query.includes('state=')) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, '/');
        }

        // Verificar se o usuário está autenticado
        isAuthenticated = await auth0Client.isAuthenticated();

        if (isAuthenticated) {
            user = await auth0Client.getUser();
            updateUIAuthenticated();
        } else {
            updateUIUnauthenticated();
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro na inicialização da aplicação', 'error');
    }
}

// Atualizar UI para usuário autenticado
function updateUIAuthenticated() {
    userInfo.style.display = 'flex';
    userName.textContent = user.name || user.email;
    userAvatar.textContent = (user.name || user.email).charAt(0).toUpperCase();

    authButtons.innerHTML = '<button class="btn btn-secondary" onclick="logout()">Logout</button>';

    divideBtn.disabled = false;
    multiplyBtn.disabled = false;
    divideBtn.title = '';
    multiplyBtn.title = '';
}

// Atualizar UI para usuário não autenticado
function updateUIUnauthenticated() {
    userInfo.style.display = 'none';
    authButtons.innerHTML = '<button class="btn btn-primary" onclick="login()">Login</button>';

    divideBtn.disabled = true;
    multiplyBtn.disabled = true;
    divideBtn.title = 'Login necessário';
    multiplyBtn.title = 'Login necessário';
}

// Login
async function login() {
    try {
        await auth0Client.loginWithRedirect();
        console.log('Tentando fazer login')
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro ao fazer login', 'error');
    }
}

// Logout
async function logout() {
    try {
        await auth0Client.logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        });
    } catch (error) {
        console.error('Erro no logout:', error);
        showNotification('Erro ao fazer logout', 'error');
    }
}

// Função para mostrar notificações
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Funções da calculadora
function updateDisplay() {
    display.textContent = currentInput;
}

function inputNumber(num) {
    if (currentInput === '0') {
        currentInput = num;
    } else {
        currentInput += num;
    }
    updateDisplay();
}

function inputOperator(op) {
    if (operator && previousInput !== null) {
        calculate();
    }

    previousInput = currentInput;
    currentInput = '0';
    operator = op;
}

function clearDisplay() {
    currentInput = '0';
    operator = null;
    previousInput = null;
    updateDisplay();
}

function deleteDigit() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

// Calcular resultado
async function calculate() {
    if (operator && previousInput !== null) {
        try {
            let token = null;

            // Verificar se a operação requer autenticação
            const requiresAuth = operator === '*' || operator === '/';

            if (requiresAuth) {
                if (!isAuthenticated) {
                    showNotification('Login necessário para esta operação', 'error');
                    return;
                }

                try {
                    token = await auth0Client.getTokenSilently();
                    console.log('Token obtido:', token ? 'Sim' : 'Não');
                } catch (tokenError) {
                    console.error('Erro ao obter token:', tokenError);
                    showNotification('Erro ao obter token de autorização', 'error');
                    return;
                }
            }

            const payload = {
                a: parseFloat(previousInput),
                b: parseFloat(currentInput),
                operation: operator
            };

            console.log('Enviando requisição:', payload);

            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('Header Authorization adicionado');
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            console.log('Status da resposta:', response.status);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro no cálculo');
            }

            const result = await response.json();
            currentInput = result.result.toString();
            operator = null;
            previousInput = null;
            updateDisplay();

        } catch (error) {
            console.error('Erro no cálculo:', error);
            showNotification(error.message || 'Erro ao calcular', 'error');
        }
    }
}

// Suporte a teclado
document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        inputNumber(e.key);
    } else if (e.key === '.') {
        inputNumber('.');
    } else if (e.key === '+') {
        inputOperator('+');
    } else if (e.key === '-') {
        inputOperator('-');
    } else if (e.key === '*') {
        if (!multiplyBtn.disabled) inputOperator('*');
    } else if (e.key === '/') {
        e.preventDefault();
        if (!divideBtn.disabled) inputOperator('/');
    } else if (e.key === 'Enter' || e.key === '=') {
        calculate();
    } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        clearDisplay();
    } else if (e.key === 'Backspace') {
        deleteDigit();
    }
});

// Inicializar a aplicação
init();