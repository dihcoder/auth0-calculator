// netlify/functions/calculate.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configuração do Auth0 (substitua pelos seus valores)
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'YOUR_AUTH0_DOMAIN.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'YOUR_AUTH0_AUDIENCE';

console.log('Auth0 Config:', { domain: AUTH0_DOMAIN, audience: AUTH0_AUDIENCE });

const _____DEBUG_____: {}[] = [];

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
        _____DEBUG_____.push(['#A: sem AUTH0_DOMAIN']);
        throw new Error('AUTH0_DOMAIN não configurado');
    }

    try {
        // Decode do token sem verificação (para debug)
        const decoded = jwt.decode(token, { complete: true });

        _____DEBUG_____.push(['#B: Decode do token sem verificação (para debug)', decoded]);
        console.log('Token decoded:', decoded);

        // ********************************

        // Verifica se foi possível decodificar
        if (!decoded || typeof decoded !== "object") {
            _____DEBUG_____.push(['#D: Token inválido', decoded]);
            throw new Error("Token inválido");
        }

        type UserClaims = {
            sub: string;
            "https://uem:": string;
            "https://una:": string;
            "https://upi:": string;
        };

        // Agora converte para o tipo correto com segurança
        const userData = decoded.payload as unknown as UserClaims;

        _____DEBUG_____.push(['#E: user email', userData['https://uem:']]);
        _____DEBUG_____.push([['#F: Nome', userData["https://una:"]], ['#F: Email', userData["https://uem:"]]]);


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
                        _____DEBUG_____.push(['#G: Erro ao obter chave:', err]);
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
                    _____DEBUG_____.push(['#H: Erro na verificação do token:', err]);
                    console.error('Erro na verificação do token:', err);
                    reject(err);
                } else {
                    _____DEBUG_____.push(['#I: Token verificado com sucesso:', decoded]);
                    console.log('Token verificado com sucesso:', decoded);
                    resolve(decoded);
                }
            });
        });
    } catch (error) {
        _____DEBUG_____.push(['#J: Erro no processamento do token:', error]);
        console.error('Erro no processamento do token:', error);
        throw error;
    }
}

// Função para validar entrada
function validateInput(body: any): CalculateRequest | null {
    const { a, b, operation } = body;

    if (typeof a !== 'number' || typeof b !== 'number') {
        _____DEBUG_____.push(['#K: validação de entrada']);
        return null;
    }

    if (!['+', '-', '*', '/'].includes(operation)) {
        _____DEBUG_____.push(['#L: validação de entrada']);
        return null;
    }

    _____DEBUG_____.push(['#M: validação de entrada']);
    return { a, b, operation };
}

// Função para realizar o cálculo
function performCalculation(a: number, b: number, operation: string): number {
    _____DEBUG_____.push(['#N: operation: ', operation]);
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
        _____DEBUG_____.push(['#O: Responder a requisições OPTIONS (preflight CORS)']);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ debug: _____DEBUG_____ })
        };
    }

    // Verificar método HTTP
    if (event.httpMethod !== 'POST') {
        _____DEBUG_____.push(['#P: Verificar método HTTP']);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido', debug: _____DEBUG_____ } as ErrorResponse)
        };
    }

    try {
        _____DEBUG_____.push(['#Q: Requisição recebida:']);
        console.log('Requisição recebida:', {
            headers: event.headers,
            body: event.body
        });

        // Parse do corpo da requisição
        const body = JSON.parse(event.body || '{}');
        const input = validateInput(body);

        if (!input) {
            _____DEBUG_____.push(['#R: not input']);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Entrada inválida', debug: _____DEBUG_____ } as ErrorResponse)
            };
        }

        const { a, b, operation } = input;

        // Verificar se a operação requer autenticação
        const requiresAuth = operation === '*' || operation === '/';

        if (requiresAuth) {
            const authHeader = event.headers.authorization || event.headers.Authorization;
            console.log('Auth header recebido:', authHeader);

            _____DEBUG_____.push(['#S: Auth header recebido:', authHeader]);

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Token de autorização necessário para multiplicação e divisão',
                        debug: _____DEBUG_____
                    } as ErrorResponse)
                };
            }

            const token = authHeader.substring(7);

            _____DEBUG_____.push(['#T: Token extraído ', token]);
            console.log('Token extraído (primeiros 50 chars):', token.substring(0, 50));

            try {
                const decoded = await verifyTokenSimple(token);
                _____DEBUG_____.push(['#U: ', decoded]);
                console.log('Token validado para usuário:', decoded?.sub || 'desconhecido');

                const name = decoded?.name || 'Nome não disponível';
                const email = decoded?.email || 'Email não disponível';

                console.log('Usuário autenticado:', { name, email });
                _____DEBUG_____.push(['#V: Cliente autenticado', { name, email }]);
            } catch (error) {
                _____DEBUG_____.push(['#W: ', error]);
                console.error('Falha na verificação do token:', error);

                // Modo de fallback: verificar se o token parece válido (não recomendado para produção)
                try {
                    const decoded = jwt.decode(token, { complete: true });
                    if (decoded && decoded.payload) {
                        _____DEBUG_____.push(['#X: token decodificado: ', decoded]);
                        console.log('Usando modo de fallback - token decodificado');
                    } else {
                        _____DEBUG_____.push(['#Y: Token malformado', token]);
                        throw new Error('Token malformado');
                    }
                } catch (fallbackError) {
                    _____DEBUG_____.push(['#Z: fallbackError: ', fallbackError]);
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Token inválido ou expirado',
                            debug: _____DEBUG_____
                        } as ErrorResponse)
                    };
                }
            }
        }

        // Realizar o cálculo
        const result = performCalculation(a, b, operation);

        // Verificar se o resultado é válido
        if (!isFinite(result)) {
            _____DEBUG_____.push(['#@A: Resultado inválido: ', result]);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Resultado inválido',
                    debug: _____DEBUG_____
                } as ErrorResponse)
            };
        }

        _____DEBUG_____.push(['#@B: Cálculo realizado:', result]);

        console.log('Cálculo realizado:', { a, b, operation, result });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: result, debug: _____DEBUG_____ } as CalculateResponse)
        };

    } catch (error) {
        _____DEBUG_____.push(['#@C: Erro no cálculo:', error]);
        console.error('Erro no cálculo:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Erro interno do servidor',
                debug: _____DEBUG_____
            } as ErrorResponse)
        };
    }
};

// Configuração do Netlify Functions
export const config = {
    path: "/calculate"
};