/**
 * MCP Filesystem Server Usage Example
 *
 * セキュアなファイルシステム操作の使用例
 */

import { mcpManager, MCPServerConfig, } from '../../src/lib/mcp/client.js';

async function filesystemExample(): Promise<void> {
    const config: MCPServerConfig = {
        name: 'filesystem',
        command: 'node',
        args: ['--loader', 'tsx/esm', 'src/lib/mcp/filesystem.ts',],
        env: {
            MCP_FILESYSTEM_ROOT_PATH: '.',
        },
    };

    try {
        console.log('🔗 Connecting to MCP Filesystem Server...',);

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

        // 例1: ルートディレクトリのファイル一覧を取得
        console.log('\\n📁 Listing files in root directory:',);
        const listResult = await client.callTool('list_files', { path: '.', },);
        if (listResult.isOk()) {
            const files = JSON.parse(listResult.value.content,);
            files.slice(0, 5,).forEach((file: any,) => {
                const type = file.isDirectory ? '📁' : '📄';
                console.log(`  ${type} ${file.name} (${file.size} bytes)`,);
            },);
            if (files.length > 5) {
                console.log(`  ... and ${files.length - 5} more files`,);
            }
        } else {
            console.error(`Error: ${listResult.error.message}`,);
        }

        // 例2: package.jsonファイルの内容を読み取り
        console.log('\\n📖 Reading package.json:',);
        const readResult = await client.callTool('read_file', {
            path: 'package.json',
        },);
        if (readResult.isOk()) {
            const packageJson = JSON.parse(readResult.value.content,);
            console.log(
                `  📦 Project: ${packageJson.name} v${packageJson.version}`,
            );
            console.log(`  📝 Description: ${packageJson.description}`,);
        } else {
            console.error(`Error: ${readResult.error.message}`,);
        }

        // 例3: ファイル情報の取得
        console.log('\\n📊 Getting file info for README.md:',);
        const infoResult = await client.callTool('get_file_info', {
            path: 'README.md',
        },);
        if (infoResult.isOk()) {
            const fileInfo = JSON.parse(infoResult.value.content,);
            console.log(`  📄 Name: ${fileInfo.name}`,);
            console.log(`  📏 Size: ${fileInfo.size} bytes`,);
            console.log(
                `  📅 Last Modified: ${
                    new Date(fileInfo.lastModified,).toLocaleString()
                }`,
            );
        } else {
            console.error(`Error: ${infoResult.error.message}`,);
        }

        // 例4: セキュリティテスト（危険なパスへのアクセス試行）
        console.log(
            '\\n🛡️  Security test - attempting dangerous path access:',
        );
        const dangerousResult = await client.callTool('read_file', {
            path: '../../../etc/passwd',
        },);
        if (dangerousResult.isErr()) {
            console.log(
                '  ✅ Security check passed - dangerous path was blocked',
            );
        } else {
            console.log(
                '  ❌ Security warning - dangerous path was not blocked!',
            );
        }
    } catch (error) {
        console.error(
            '❌ Error:',
            error instanceof Error ? error.message : 'Unknown error',
        );
    } finally {
        // クリーンアップ
        console.log('\\n🧹 Cleaning up...',);
        await mcpManager.disconnect('filesystem',);
        console.log('✅ Disconnected from MCP server',);
    }
}

// 直接実行時
if (import.meta.url === `file://${process.argv[1]}`) {
    filesystemExample().catch(console.error,);
}

export { filesystemExample, };
