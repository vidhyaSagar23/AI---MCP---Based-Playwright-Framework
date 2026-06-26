import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const server = new Server(
    { name: 'browser-harvester-agent', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'harvest_page_locators',
                description: 'Scans a URL and extracts interactive elements into a YAML locator file.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        targetUrl: { type: 'string', description: 'The URL to scan' }
                    },
                    required: ['targetUrl']
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'harvest_page_locators') {
        const url = request.params.arguments?.targetUrl as string;
        
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url);

        // Simple script to extract inputs and buttons
        const locators = await page.evaluate(() => {
            const elements: Record<string, string> = {};
            const interactables = document.querySelectorAll('input, button, a');
            
            interactables.forEach((el, index) => {
                const tag = el.tagName.toLowerCase();
                const id = el.getAttribute('id') || el.getAttribute('name') || `${tag}_${index}`;
                // Simplified XPath generation
                elements[id] = `//${tag}[@id='${id}' or @name='${id}']`;
            });
            return elements;
        });

        await browser.close();

        // Save to YAML
        const yamlContent = Object.entries(locators)
            .map(([key, val]) => `${key}: "${val}"`)
            .join('\n');
        
        const fileName = `${new URL(url).pathname.split('/').filter(Boolean).pop() || 'index'}.yaml`;
        const filePath = path.join(process.cwd(), 'framework-core/locators', fileName);
        
        fs.writeFileSync(filePath, yamlContent);

        return {
            content: [{ type: 'text', text: `✅ Harvested locators saved to: ${filePath}\n\n${yamlContent}` }]
        };
    }
    throw new Error('Unknown tool');
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Browser Harvester MCP Server booted');
}

main().catch(console.error);