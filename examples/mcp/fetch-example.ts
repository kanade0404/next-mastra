/**
 * MCP Fetch Server Usage Example
 *
 * セキュアなWeb コンテンツ取得の使用例
 */

import { mcpManager, MCPServerConfig, } from '../../src/lib/mcp/client.js';

async function fetchExample(): Promise<void> {
    const config: MCPServerConfig = {
        name: 'fetch',
        command: 'node',
        args: ['--loader', 'tsx/esm', 'src/lib/mcp/fetch.ts',],
        env: {
            MCP_FETCH_USER_AGENT: 'NextMastraBot/1.0',
        },
    };

    try {
        console.log('🔗 Connecting to MCP Fetch Server...',);

        // サーバーに接続
        const connectResult = await mcpManager.connect(config,);
        if (connectResult.isErr()) {
            throw new Error(
                `Connection failed: ${connectResult.error.message}`,
            );
        }

        const client = connectResult.value;
        console.log('✅ Connected successfully!',);

        // 利用可能なツールを確認
        console.log('\\n🔧 Available tools:',);
        const toolsResult = await client.listTools();
        if (toolsResult.isOk()) {
            toolsResult.value.tools.forEach((tool,) => {
                console.log(`  - ${tool.name}: ${tool.description}`,);
            },);
        }

        // 例1: GitHub のページを取得
        console.log('\\n🌐 Fetching GitHub page:',);
        const githubUrl = 'https://docs.github.com/en/get-started/quickstart';
        const fetchResult = await client.callTool('fetch_url', {
            url: githubUrl,
        },);
        if (fetchResult.isOk()) {
            const response = JSON.parse(fetchResult.value.content,);
            console.log(`  📄 Title: ${response.title || 'No title'}`,);
            console.log(`  📊 Status: ${response.statusCode}`,);
            console.log(`  📝 Content Type: ${response.contentType}`,);
            console.log(
                `  📏 Content Length: ${response.content.length} characters`,
            );
            console.log(
                `  ⏰ Fetched at: ${
                    new Date(response.timestamp,).toLocaleString()
                }`,
            );
        } else {
            console.error(`Error: ${fetchResult.error.message}`,);
        }

        // 例2: Markdown形式でページを取得
        console.log('\\n📝 Fetching as Markdown:',);
        const mdUrl =
            'https://docs.github.com/en/get-started/quickstart/hello-world';
        const markdownResult = await client.callTool('fetch_as_markdown', {
            url: mdUrl,
        },);
        if (markdownResult.isOk()) {
            const markdown = markdownResult.value.content;
            const lines = markdown.split('\\n',);
            console.log(`  📄 Markdown content (${lines.length} lines):`,);
            console.log(`  📖 Preview (first 5 lines):`,);
            lines.slice(0, 5,).forEach((line, index,) => {
                console.log(
                    `    ${index + 1}: ${line.substring(0, 80,)}${
                        line.length > 80 ? '...' : ''
                    }`,
                );
            },);
        } else {
            console.error(`Error: ${markdownResult.error.message}`,);
        }

        // 例3: Next.js ドキュメントを取得
        console.log('\\n⚡ Fetching Next.js documentation:',);
        const nextUrl = 'https://nextjs.org/docs/getting-started/installation';
        const nextResult = await client.callTool('fetch_as_markdown', {
            url: nextUrl,
        },);
        if (nextResult.isOk()) {
            const content = nextResult.value.content;
            const installationMatch = content.match(/npm install[^\\n]*/i,);
            if (installationMatch) {
                console.log(
                    `  💻 Installation command found: ${installationMatch[0]}`,
                );
            }
            console.log(`  📄 Content length: ${content.length} characters`,);
        } else {
            console.error(`Error: ${nextResult.error.message}`,);
        }

        // 例4: セキュリティテスト（危険なURLへのアクセス試行）
        console.log('\\n🛡️  Security test - attempting dangerous URL access:',);
        const dangerousResult = await client.callTool('fetch_url', {
            url: 'http://localhost:22/secret',
        },);
        if (dangerousResult.isErr()) {
            console.log(
                '  ✅ Security check passed - dangerous URL was blocked',
            );
        } else {
            console.log(
                '  ❌ Security warning - dangerous URL was not blocked!',
            );
        }

        // 例5: 無効なURLのテスト
        console.log('\\n❌ Testing invalid URL:',);
        const invalidResult = await client.callTool('fetch_url', {
            url: 'not-a-valid-url',
        },);
        if (invalidResult.isErr()) {
            console.log('  ✅ Invalid URL properly rejected',);
        } else {
            console.log('  ❌ Invalid URL was unexpectedly accepted',);
        }
    } catch (error) {
        console.error(
            '❌ Error:',
            error instanceof Error ? error.message : 'Unknown error',
        );
    } finally {
        // クリーンアップ
        console.log('\\n🧹 Cleaning up...',);
        await mcpManager.disconnect('fetch',);
        console.log('✅ Disconnected from MCP server',);
    }
}

// 直接実行時
if (import.meta.url === `file://${process.argv[1]}`) {
    fetchExample().catch(console.error,);
}

export { fetchExample, };
