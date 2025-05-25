// netlify/functions/calculate.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configuração do Auth0 (substitua pelos seus valores)
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'YOUR_AUTH0_DOMAIN.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'YOUR_AUTH0_AUDIENCE';

console.log('Auth0 Config:', { domain: AUTH0_DOMAIN, audience: AUTH0_AUDIENCE });

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

// Função para verificar token JWT (versão simplificada)
async function verifyTokenSimple(token: string): Promise<any> {
    if (!AUTH0_DOMAIN) {
        throw new Error('AUTH0_DOMAIN não configurado');
    }

    try {
        // Decode do token sem verificação (para debug)
        const decoded = jwt.decode(token, { complete: true });
        console.log('Token decoded:', decoded);

        // Cliente JWKS
        const client = jwksClient({
            jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 600000
        });

        return new Promise((resolve, reject) => {
            // Verificação do token
            jwt.verify(token, (header, callback) => {
                client.getSigningKey(header.kid, (err, key) => {
                    if (err) {
                        console.error('Erro ao obter chave:', err);
                        callback(err);
                        return;
                    }
                    const signingKey = key?.getPublicKey();
                    callback(null, signingKey);
                });
            }, {
                audience: AUTH0_AUDIENCE || undefined,
                issuer: `https://${AUTH0_DOMAIN}/`,
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) {
                    console.error('Erro na verificação do token:', err);
                    reject(err);
                } else {
                    console.log('Token verificado com sucesso:', decoded);
                    resolve(decoded);
                }
            });
        });
    } catch (error) {
        console.error('Erro no processamento do token:', error);
        throw error;
    }
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
        console.log('Requisição recebida:', {
            headers: event.headers,
            body: event.body
        });

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


        const debug: {}[] = [];

        if (requiresAuth) {
            const authHeader = event.headers.authorization || event.headers.Authorization;
            console.log('Auth header recebido:', authHeader);

            debug.push(['#177: ', authHeader]);

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

            debug.push(['#191: ', token]);
            console.log('Token extraído (primeiros 50 chars):', token.substring(0, 50));

            try {
                const decoded = await verifyTokenSimple(token);
                debug.push(['#196: ', decoded]);
                console.log('Token validado para usuário:', decoded?.sub || 'desconhecido');
            } catch (error) {
                debug.push(['#199: ', error]);
                console.error('Falha na verificação do token:', error);

                // Modo de fallback: verificar se o token parece válido (não recomendado para produção)
                try {
                    const decoded = jwt.decode(token, { complete: true });
                    if (decoded && decoded.payload) {
                        debug.push(['#201: ', decoded]);
                        console.log('Usando modo de fallback - token decodificado');
                    } else {
                        debug.push(['#204: ', token]);
                        throw new Error('Token malformado');
                    }
                } catch (fallbackError) {
                        debug.push(['#208: ', fallbackError]);
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Token inválido ou expirado',
                            debug: debug
                        } as ErrorResponse)
                    };
                }
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

        console.log('Cálculo realizado:', { a, b, operation, result });

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