let auth0Client = null;
let isAuthenticated = false;
let currentUser = null;

let currentNumber = '';
let previousNumber = '';
let operator = '';

// Configuração do Auth0 - SUBSTITUA PELOS SEUS VALORES
const AUTH0_CONFIG = {
    domain: 'dev-uddg6jbjtj3w6kbp.us.auth0.com',
    clientId: 'SmiY9TAFSH7YUDiUy7k0Z6CJKFW2HP2K',
    redirectUri: window.location.origin
};

// Inicializar Auth0
async function initAuth0() {
    try {
        auth0Client = await auth0.createAuth0Client({
            domain: AUTH0_CONFIG.domain,
            clientId: AUTH0_CONFIG.clientId,
            authorizationParams: {
                redirect_uri: AUTH0_CONFIG.redirectUri
            }
        });

        // Verificar se há callback de login
        const query = window.location.search;
        if (query.includes('code=') && query.includes('state=')) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, '/');
        }

        // Verificar status de autenticação
        isAuthenticated = await auth0Client.isAuthenticated();

        if (isAuthenticated) {
            currentUser = await auth0Client.getUser();
        }

        updateUI();
    } catch (error) {
        console.error('Erro ao inicializar Auth0:', error);
        showResult('Erro na autenticação. Verifique a configuração.', 'error');
    }
}

// Atualizar interface baseada no status de autenticação
function updateUI() {
    const userInfo = document.getElementById('userInfo');
    const authBtn = document.getElementById('authBtn');
    const divBtn = document.getElementById('divBtn');
    const mulBtn = document.getElementById('mulBtn');

    if (isAuthenticated && currentUser) {
        userInfo.textContent = `Olá, ${currentUser.name || currentUser.email}`;
        authBtn.textContent = 'Sair';
        authBtn.className = 'auth-btn logout-btn';

        // Habilitar operações protegidas
        divBtn.classList.add('authenticated');
        mulBtn.classList.add('authenticated');
    } else {
        userInfo.textContent = 'Não autenticado';
        authBtn.textContent = 'Entrar';
        authBtn.className = 'auth-btn login-btn';

        // Desabilitar operações protegidas
        divBtn.classList.remove('authenticated');
        mulBtn.classList.remove('authenticated');
    }
}

// Gerenciar autenticação
async function handleAuth() {
    if (isAuthenticated) {
        // Logout
        await auth0Client.logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        });
    } else {
        // Login
        await auth0Client.loginWithRedirect();
    }
}

// Funções da calculadora
function addNumber(num) {
    const display = document.getElementById('display');

    if (num === '.' && currentNumber.includes('.')) {
        return;
    }

    if (currentNumber === '0' && num !== '.') {
        currentNumber = num;
    } else {
        currentNumber += num;
    }

    display.value = currentNumber;
    hideResult();
}

function setOperator(op) {
    // Verificar se a operação requer autenticação
    if ((op === '*' || op === '/') && !isAuthenticated) {
        showResult('Esta operação requer autenticação. Faça login para continuar.', 'info');
        return;
    }

    if (currentNumber === '') return;

    if (previousNumber !== '' && operator !== '') {
        calculate();
    }

    operator = op;
    previousNumber = currentNumber;
    currentNumber = '';

    const display = document.getElementById('display');
    display.value = previousNumber + ' ' + getOperatorSymbol(op);
}

function getOperatorSymbol(op) {
    switch (op) {
        case '+': return '+';
        case '-': return '-';
        case '*': return '×';
        case '/': return '÷';
        default: return op;
    }
}

async function calculate() {
    if (previousNumber === '' || currentNumber === '' || operator === '') {
        return;
    }

    // Verificar se a operação requer autenticação
    if ((operator === '*' || operator === '/') && !isAuthenticated) {
        showResult('Esta operação requer autenticação. Faça login para continuar.', 'info');
        return;
    }

    showLoading(true);

    try {
        const token = isAuthenticated ? await auth0Client.getTokenSilently() : null;

        const response = await fetch('/.netlify/functions/calc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
                a: parseFloat(previousNumber),
                b: parseFloat(currentNumber),
                operation: operator
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro no cálculo');
        }

        const display = document.getElementById('display');
        display.value = data.result;

        showResult(`${previousNumber} ${getOperatorSymbol(operator)} ${currentNumber} = ${data.result}`, 'success');

        // Reset
        currentNumber = data.result.toString();
        previousNumber = '';
        operator = '';

    } catch (error) {
        console.error('Erro no cálculo:', error);
        showResult(error.message || 'Erro ao realizar cálculo', 'error');
    } finally {
        showLoading(false);
    }
}

function clearDisplay() {
    currentNumber = '';
    previousNumber = '';
    operator = '';
    document.getElementById('display').value = '';
    hideResult();
}

function deleteLast() {
    if (currentNumber.length > 0) {
        currentNumber = currentNumber.slice(0, -1);
        document.getElementById('display').value = currentNumber;
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.classList.toggle('show', show);
}

function showResult(message, type) {
    const result = document.getElementById('result');
    result.textContent = message;
    result.className = `result ${type}`;
    result.style.display = 'flex';
}

function hideResult() {
    const result = document.getElementById('result');
    result.style.display = 'none';
}

// Suporte a teclado
document.addEventListener('keydown', function (event) {
    const key = event.key;

    if (key >= '0' && key <= '9') {
        addNumber(key);
    } else if (key === '.') {
        addNumber('.');
    } else if (['+', '-', '*', '/'].includes(key)) {
        setOperator(key);
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearDisplay();
    } else if (key === 'Backspace') {
        deleteLast();
    }
});

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', function () {
    initAuth0();
});