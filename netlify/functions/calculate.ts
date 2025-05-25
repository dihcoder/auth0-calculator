// netlify/functions/calculate.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configuração do Auth0 (substitua pelos seus valores)
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'YOUR_AUTH0_DOMAIN.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'YOUR_AUTH0_AUDIENCE';

// Cliente JWKS para verificação de tokens
const client = jwksClient({
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Interface para o corpo da requisição
interface CalculateRequest {
    a: number;
    b: number;
    operation: '+' | '-' | '*' | '/';
}

// Interface para a resposta
interface CalculateResponse {
    result: number;
}

// Interface para erro
interface ErrorResponse {
    error: string;
}

// Função para obter a chave de assinatura
function getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

// Função para verificar token JWT
async function verifyToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {
            audience: AUTH0_AUDIENCE,
            issuer: `https://${AUTH0_DOMAIN}/`,
            algorithms: ['RS256']
        }, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

// Função para validar entrada
function validateInput(body: any): CalculateRequest | null {
    const { a, b, operation } = body;

    if (typeof a !== 'number' || typeof b !== 'number') {
        return null;
    }

    if (!['+', '-', '*', '/'].includes(operation)) {
        return null;
    }

    return { a, b, operation };
}

// Função para realizar o cálculo
function performCalculation(a: number, b: number, operation: string): number {
    switch (operation) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '*':
            return a * b;
        case '/':
            if (b === 0) {
                throw new Error('Divisão por zero não é permitida');
            }
            return a / b;
        default:
            throw new Error('Operação inválida');
    }
}

// Handler principal
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Responder a requisições OPTIONS (preflight CORS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Verificar método HTTP
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' } as ErrorResponse)
        };
    }

    try {
        // Parse do corpo da requisição
        const body = JSON.parse(event.body || '{}');
        const input = validateInput(body);

        if (!input) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Entrada inválida' } as ErrorResponse)
            };
        }

        const { a, b, operation } = input;

        // Verificar se a operação requer autenticação
        const requiresAuth = operation === '*' || operation === '/';

        if (requiresAuth) {
            const authHeader = event.headers.authorization || event.headers.Authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Token de autorização necessário para multiplicação e divisão'
                    } as ErrorResponse)
                };
            }

            const token = authHeader.substring(7);

            try {
                await verifyToken(token);
            } catch (error) {
                console.error('Erro na verificação do token:', error);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Token inválido ou expirado'
                    } as ErrorResponse)
                };
            }
        }

        // Realizar o cálculo
        const result = performCalculation(a, b, operation);

        // Verificar se o resultado é válido
        if (!isFinite(result)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Resultado inválido'
                } as ErrorResponse)
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result } as CalculateResponse)
        };

    } catch (error) {
        console.error('Erro no cálculo:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            } as ErrorResponse)
        };
    }
};

// Configuração do Netlify Functions
export const config = {
    path: "/calculate"
};