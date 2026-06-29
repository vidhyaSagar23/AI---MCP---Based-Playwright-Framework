import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Project } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const server = new Server(
    { name: 'ast-manager-agent', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'inject_po_methods',
                description: 'Injects new Playwright methods into a Page Object file using AST.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string' },
                        methods: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['filePath', 'methods']
                }
            },
            {
                name: 'merge_yaml_locators',
                description: 'Safely appends new locators to a YAML file.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string' },
                        newLocators: { type: 'object' }
                    },
                    required: ['filePath', 'newLocators']
                }
            },
            {
                name: 'compile_test_scripts',
                description: 'Compiles parsed Excel test JSON into Playwright spec TypeScript files.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        testDataJson: { type: 'string', description: 'Stringified JSON object of test steps' }
                    },
                    required: ['testDataJson']
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'inject_po_methods') {
        const { filePath, methods } = request.params.arguments as any;
        const fullPath = path.resolve(process.cwd(), filePath);
        
        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(fullPath);
        const clazz = sourceFile.getClasses()[0];

        if (!clazz) {
            throw new Error('No class found in the provided file.');
        }

        methods.forEach((method: string) => {
            if (!clazz.getMethod(method)) {
                clazz.addMethod({
                    name: method,
                    isAsync: true,
                    statements: 'await this.page.locator(\'...\').click();'
                });
            }
        });

        await sourceFile.save();
        return { content: [{ type: 'text', text: `✅ Methods injected into ${filePath}` }] };
    }

    if (request.params.name === 'merge_yaml_locators') {
        const { filePath, newLocators } = request.params.arguments as any;
        const fullPath = path.resolve(process.cwd(), filePath);
        
        let existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
        for (const [key, val] of Object.entries(newLocators)) {
            if (!existing.includes(key)) {
                existing += `\n${key}: "${val}"`;
            }
        }
        fs.writeFileSync(fullPath, existing);
        return { content: [{ type: 'text', text: `✅ YAML updated at ${filePath}` }] };
    }

    if (request.params.name === 'compile_test_scripts') {
        const { testDataJson } = request.params.arguments as any;
        const parsedCases = JSON.parse(testDataJson);
        const testsDir = path.resolve(process.cwd(), 'tests');

        if (!fs.existsSync(testsDir)) {
            fs.mkdirSync(testsDir, { recursive: true });
        }

        const generatedFiles: string[] = [];

        for (const [testId, steps] of Object.entries(parsedCases)) {
            const fileName = `${testId.toLowerCase()}.spec.ts`;
            const targetPath = path.join(testsDir, fileName);

            let specCode = `import { test, expect } from '@playwright/test';\n\n`;
            specCode += `test('${testId}', async ({ page }) => {\n`;

            (steps as any[]).forEach((step) => {
                specCode += `    // Step ${step.step}: [${step.module}] ${step.action}\n`;
                const actionLower = step.action.toLowerCase();

                if (actionLower.includes('navigate') && step.data) {
                    specCode += `    await page.goto('${step.data}');\n`;
                } else if (actionLower.includes('enter') && step.data) {
                    specCode += `    await page.getByRole('textbox').first().fill('${step.data}');\n`;
                } else if (actionLower.includes('click')) {
                    specCode += `    await page.getByRole('button').first().click();\n`;
                }
            });

            specCode += `});\n`;

            fs.writeFileSync(targetPath, specCode);
            generatedFiles.push(targetPath);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `✅ Successfully generated Playwright specs:\n${generatedFiles.join('\n')}`
                }
            ]
        };
    }

    throw new Error('Tool not found');
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ AST Manager MCP Server booted');
}

main().catch((error) => {
    console.error('Fatal error in AST Manager:', error);
    process.exit(1);
});