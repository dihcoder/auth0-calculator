// netlify/functions/calculate.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configuração do Auth0 - SUBSTITUA PELOS SEUS VALORES
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'SEU_DOMINIO.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://SEU_DOMINIO.auth0.com/api/v2/';

// Cliente JWKS para verificar tokens
const client = jwksClient({
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

interface CalculationRequest {
    a: number;
    b: number;
    operation: '+' | '-' | '*' | '/';
}

interface CalculationResponse {
    result: number;
    operation: string;
}

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

// Função para verificar o token JWT
function verifyToken(token: string): Promise<any> {
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
function validateInput(body: any): CalculationRequest | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

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

// Função para verificar se a operação requer autenticação
function requiresAuth(operation: string): boolean {
    return operation === '*' || operation === '/';
}

// Handler principal
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    // Apenas POST é permitido
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' } as ErrorResponse),
        };
    }

    try {
        // Parse do body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'JSON inválido' } as ErrorResponse),
            };
        }

        // Validar entrada
        const validatedInput = validateInput(requestBody);
        if (!validatedInput) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Parâmetros inválidos. Esperado: {a: number, b: number, operation: string}' } as ErrorResponse),
            };
        }

        const { a, b, operation } = validatedInput;

        // Verificar se a operação requer autenticação
        if (requiresAuth(operation)) {
            const authHeader = event.headers.authorization || event.headers.Authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Token de autenticação requerido para esta operação' } as ErrorResponse),
                };
            }

            const token = authHeader.substring(7); // Remove 'Bearer '

            try {
                // Verificar o token
                await verifyToken(token);
            } catch (error) {
                console.error('Erro na verificação do token:', error);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Token inválido ou expirado' } as ErrorResponse),
                };
            }
        }

        // Realizar o cálculo
        let result: number;
        try {
            result = performCalculation(a, b, operation);
        } catch (calculationError: any) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: calculationError.message } as ErrorResponse),
            };
        }

        // Arredondar resultado para evitar problemas de ponto flutuante
        const roundedResult = Math.round(result * 1000000000) / 1000000000;

        const response: CalculationResponse = {
            result: roundedResult,
            operation: `${a} ${operation} ${b}`,
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response),
        };

    } catch (error) {
        console.error('Erro interno:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' } as ErrorResponse),
        };
    }
};