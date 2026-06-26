import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const server = new Server(
    { name: 'excel-parser-agent', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

// 1. Declare the tools this server provides
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'parse_test_sheet',
                description: 'Reads a functional test case Excel sheet (.xlsx) and outputs structured JSON steps.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Relative path to the Excel file' }
                    },
                    required: ['filePath']
                }
            }
        ]
    };
});

// 2. Execute the tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'parse_test_sheet') {
        const relativePath = request.params.arguments?.filePath as string;
        const fullPath = path.resolve(process.cwd(), relativePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Excel file not found at: ${fullPath}`);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(fullPath);
        const worksheet = workbook.worksheets[0]; // Grab Sheet 1

        const testCases: Record<string, any[]> = {};

        // Parse rows (Assuming Row 1 contains headers)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip Header

            const tcId = row.getCell(1).text.trim();
            const moduleName = row.getCell(2).text.trim() || 'General';
            const stepNo = row.getCell(3).text.trim();
            const action = row.getCell(4).text.trim();
            const data = row.getCell(5).text.trim();

            if (!tcId || !action) return;

            if (!testCases[tcId]) {
                testCases[tcId] = [];
            }

            testCases[tcId].push({
                step: Number(stepNo) || testCases[tcId].length + 1,
                module: moduleName,
                action: action,
                data: data
            });
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(testCases, null, 2)
                }
            ]
        };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
});

// 3. Boot up the stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Excel Parser MCP Server booted over stdio');
}

main().catch((error) => {
    console.error('Fatal error in Excel Parser:', error);
    process.exit(1);
});