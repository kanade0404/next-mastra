/**
 * MCP (Model Context Protocol) クライアント実装
 * セキュアで型安全なMCPサーバー通信
 */

import { ChildProcess, spawn, } from 'child_process';
import { err, ok, Result, } from 'neverthrow';

/**
 * MCPサーバーエラー
 */
export class MCPError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly serverName?: string,
    ) {
        super(message,);
        this.name = 'MCPError';
    }
}

/**
 * MCPサーバー設定
 */
export interface MCPServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    timeout?: number;
}

/**
 * MCPツール定義
 */
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

/**
 * MCPツール実行結果
 */
export interface MCPToolResult {
    content: string;
    isError?: boolean;
}

/**
 * MCPリソース定義
 */
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}

/**
 * MCPクライアント
 */
export class MCPClient {
    private process: ChildProcess | null = null;
    private isConnected = false;
    private requestId = 0;
    private pendingRequests = new Map<number, {
        resolve: (value: any,) => void;
        reject: (error: Error,) => void;
    }>();

    constructor(
        private config: MCPServerConfig,
    ) {}

    /**
     * MCPサーバーに接続
     */
    async connect(): Promise<Result<void, MCPError>> {
        try {
            if (this.isConnected) {
                return ok(undefined,);
            }

            // プロセスを起動
            this.process = spawn(this.config.command, this.config.args, {
                env: { ...process.env, ...this.config.env, },
                stdio: ['pipe', 'pipe', 'pipe',],
            },);

            if (
                !this.process.stdout || !this.process.stdin
                || !this.process.stderr
            ) {
                return err(
                    new MCPError(
                        'Failed to create process streams',
                        'PROCESS_ERROR',
                        this.config.name,
                    ),
                );
            }

            // プロセスイベントハンドラーの設定
            this.process.on('error', (error,) => {
                console.error(`MCP server ${this.config.name} error:`, error,);
                this.isConnected = false;
            },);

            this.process.on('exit', (code,) => {
                console.log(
                    `MCP server ${this.config.name} exited with code ${code}`,
                );
                this.isConnected = false;
            },);

            // 標準出力のメッセージ処理
            this.process.stdout.on('data', (data,) => {
                this.handleServerMessage(data.toString(),);
            },);

            // 標準エラー出力のログ
            this.process.stderr.on('data', (data,) => {
                console.error(
                    `MCP server ${this.config.name} stderr:`,
                    data.toString(),
                );
            },);

            // 初期化
            const initResult = await this.sendRequest('initialize', {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {},
                    resources: {},
                },
                clientInfo: {
                    name: 'next-mastra',
                    version: '1.0.0',
                },
            },);

            if (initResult.isErr()) {
                return err(initResult.error,);
            }

            this.isConnected = true;
            return ok(undefined,);
        } catch (error) {
            return err(
                new MCPError(
                    `Failed to connect to MCP server: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`,
                    'CONNECTION_ERROR',
                    this.config.name,
                ),
            );
        }
    }

    /**
     * MCPサーバーから切断
     */
    async disconnect(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
    }

    /**
     * 利用可能なツールのリストを取得
     */
    async listTools(): Promise<Result<{ tools: MCPTool[]; }, MCPError>> {
        return await this.sendRequest('tools/list', {},);
    }

    /**
     * ツールを実行
     */
    async callTool(
        name: string,
        arguments_: Record<string, unknown>,
    ): Promise<Result<MCPToolResult, MCPError>> {
        return await this.sendRequest('tools/call', {
            name,
            arguments: arguments_,
        },);
    }

    /**
     * 利用可能なリソースのリストを取得
     */
    async listResources(): Promise<
        Result<{ resources: MCPResource[]; }, MCPError>
    > {
        return await this.sendRequest('resources/list', {},);
    }

    /**
     * リソースを読み取り
     */
    async readResource(
        uri: string,
    ): Promise<
        Result<
            {
                contents: Array<
                    { uri: string; mimeType?: string; text?: string; }
                >;
            },
            MCPError
        >
    > {
        return await this.sendRequest('resources/read', { uri, },);
    }

    /**
     * MCPサーバーにリクエストを送信
     */
    private async sendRequest(
        method: string,
        params: Record<string, unknown>,
    ): Promise<Result<any, MCPError>> {
        if (!this.isConnected || !this.process?.stdin) {
            return err(
                new MCPError(
                    'Not connected to MCP server',
                    'NOT_CONNECTED',
                    this.config.name,
                ),
            );
        }

        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };

        return new Promise((resolve,) => {
            this.pendingRequests.set(id, {
                resolve: (value,) => resolve(ok(value,),),
                reject: (error,) => resolve(err(error,),),
            },);

            // タイムアウト設定
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id,);
                resolve(
                    err(
                        new MCPError(
                            'Request timeout',
                            'TIMEOUT',
                            this.config.name,
                        ),
                    ),
                );
            }, this.config.timeout || 30000,);

            this.pendingRequests.get(id,)!.resolve = (value,) => {
                clearTimeout(timeout,);
                this.pendingRequests.delete(id,);
                resolve(ok(value,),);
            };

            this.pendingRequests.get(id,)!.reject = (error,) => {
                clearTimeout(timeout,);
                this.pendingRequests.delete(id,);
                resolve(err(error,),);
            };

            // リクエストを送信
            this.process!.stdin!.write(JSON.stringify(request,) + '\n',);
        },);
    }

    /**
     * サーバーからのメッセージを処理
     */
    private handleServerMessage(data: string,): void {
        const lines = data.trim().split('\n',);

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const message = JSON.parse(line,);

                if (message.id && this.pendingRequests.has(message.id,)) {
                    const handlers = this.pendingRequests.get(message.id,)!;

                    if (message.error) {
                        handlers.reject(
                            new MCPError(
                                message.error.message || 'Unknown error',
                                message.error.code,
                                this.config.name,
                            ),
                        );
                    } else {
                        handlers.resolve(message.result,);
                    }
                }
            } catch (error) {
                console.error(`Failed to parse MCP message: ${line}`, error,);
            }
        }
    }
}

/**
 * MCPサーバーマネージャー
 */
export class MCPManager {
    private clients = new Map<string, MCPClient>();

    /**
     * MCPサーバーに接続
     */
    async connect(
        config: MCPServerConfig,
    ): Promise<Result<MCPClient, MCPError>> {
        const client = new MCPClient(config,);
        const result = await client.connect();

        if (result.isOk()) {
            this.clients.set(config.name, client,);
            return ok(client,);
        }

        return err(result.error,);
    }

    /**
     * MCPサーバーから切断
     */
    async disconnect(name: string,): Promise<void> {
        const client = this.clients.get(name,);
        if (client) {
            await client.disconnect();
            this.clients.delete(name,);
        }
    }

    /**
     * 接続されているクライアントを取得
     */
    getClient(name: string,): MCPClient | null {
        return this.clients.get(name,) || null;
    }

    /**
     * 全てのクライアントから切断
     */
    async disconnectAll(): Promise<void> {
        const disconnectPromises = Array.from(this.clients.values(),).map(
            client => client.disconnect(),
        );
        await Promise.all(disconnectPromises,);
        this.clients.clear();
    }
}

/**
 * グローバルMCPマネージャーインスタンス
 */
export const mcpManager = new MCPManager();
