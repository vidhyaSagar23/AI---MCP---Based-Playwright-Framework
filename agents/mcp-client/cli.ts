import { Command } from 'commander';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

const program = new Command();

program
  .name('ai-playwright-cli')
  .description('Local Central Orchestrator for AI-Driven Test Framework')
  .version('1.0.0');

/**
 * Helper function to spin up a local MCP Server process and connect to it.
 * We use 'tsx' to directly execute the TypeScript server files.
 */
async function connectToServer(serverName: string, scriptRelativePath: string) {
    // Resolve path relative to this cli.ts file (agents/mcp-client)
    const scriptPath = path.resolve(__dirname, '..', scriptRelativePath);
    
    console.log(`🔌 Starting MCP Server: ${serverName}...`);
    
    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['tsx', scriptPath]
    });

    // FIXED: Clients do not declare 'tools' capability, only Servers do.
    const client = new Client(
        { name: 'framework-orchestrator', version: '1.0.0' },
        { capabilities: {} } 
    );

    await client.connect(transport);
    console.log(`✅ Connected to ${serverName}`);
    return { client, transport };
}

/**
 * COMMAND 1: HARVEST
 * Execution: npm run ai:harvest -- --url="https://example.com"
 */
program
  .command('harvest')
  .description('Spin up the Browser Harvester Agent to map UI elements')
  .requiredOption('-u, --url <url>', 'Target base URL to harvest')
  .action(async (options) => {
      console.log(`\n🚀 PHASE 1: Initiating Browser Harvester for ${options.url}`);
      
      const { client, transport } = await connectToServer('Browser Harvester', 'mcp-servers/browserHarvester.ts');
      
      try {
          // FIXED: Explicitly typed as 'any' to resolve TypeScript strict 'unknown' payload checks
          const result: any = await client.callTool({
              name: 'harvest_page_locators',
              arguments: { targetUrl: options.url }
          });
          console.log('\n📄 Harvester Results:\n', result.content[0].text);
      } catch (error: any) {
          console.error('❌ Harvester failed:', error.message);
      } finally {
          await transport.close();
      }
  });

/**
 * COMMAND 2: GENERATE
 * Execution: npm run ai:generate -- --file="test-data/cases.xlsx"
 */
program
  .command('generate')
  .description('Parse Excel test cases and generate Playwright spec files')
  .requiredOption('-f, --file <filePath>', 'Path to the Excel test case file')
  .action(async (options) => {
      console.log(`\n🚀 PHASE 2: Initiating Test Generator for ${options.file}`);
      
      const { client: excelClient, transport: excelTransport } = await connectToServer('Excel Parser', 'mcp-servers/excelParser.ts');
      const { client: astClient, transport: astTransport } = await connectToServer('AST Code Manager', 'mcp-servers/fileAstManager.ts');
      
      try {
          console.log('📊 Parsing Excel File...');
          // FIXED: Explicitly typed as 'any'
          const stepData: any = await excelClient.callTool({
              name: 'parse_test_sheet',
              arguments: { filePath: options.file }
          });
          console.log('✅ Excel parsed successfully. Generating Page Objects and Specs...');

          // FIXED: Explicitly typed as 'any'
          const codeResult: any = await astClient.callTool({
              name: 'compile_test_scripts',
              arguments: { testDataJson: stepData.content[0].text }
          });
          console.log('\n🛠️ Generation Results:\n', codeResult.content[0].text);
      } catch (error: any) {
          console.error('❌ Generation failed:', error.message);
      } finally {
          await excelTransport.close();
          await astTransport.close();
      }
  });

program.parse(process.argv);