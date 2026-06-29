# APEX: Autonomous AI-Playwright Test Engineering Framework

An enterprise, model-agnostic test automation framework powered by **Playwright**, **TypeScript**, and the **Model Context Protocol (MCP)**. 

Traditional test automation requires manual Page Object maintenance, brittle locator scraping, and repetitive boilerplate authoring. APEX decouples these workflows into isolated AI background servers orchestrated by a local command-line client. You write standard functional test steps in Excel; the framework securely maps the live web DOM, compiles the Abstract Syntax Tree (AST), and writes executable TypeScript specs for you.

---

## 🏛️ System Architecture

APEX operates as a local Monorepo. When you invoke a CLI command, the Orchestrator silently boots the required MCP servers over `stdio`, executes the procedure, writes the code to disk, and severs the server transport.

```text
├── agents/
│   ├── mcp-client/cli.ts             # Central Orchestrator
│   ├── mcp-servers/
│   │   ├── browserHarvester.ts       # Agent 1: Live DOM Scraper
│   │   ├── excelParser.ts            # Agent 2: Spreadsheet to JSON mapper
│   │   └── fileAstManager.ts         # Agent 3: ts-morph AST Code Injector
│   └── utils/llmProvider.ts          # Vercel AI SDK Model-Agnostic Router
├── framework-core/
│   ├── .auth/                        # Saved session states for secure pages
│   ├── locators/                     # Harvested YAML element repositories
│   ├── pageObjects/                  # Auto-generated Playwright Classes
│   └── auth-setup.ts                 # Utility to generate enterprise session tokens
├── test-data/                        # Input .xlsx Functional Test Sheets
└── tests/                            # Output executable .spec.ts files
```

---

## ⚡ Zero-to-Hero Setup

### 1. Prerequisites
* **Node.js** (v18+)
* An API Key from any supported LLM provider (**Groq**, **Google Gemini**, **Anthropic Claude**, or **OpenAI**)

### 2. Installation
Clone the repository and install the required packages and OS-level browser binaries:
```bash
git clone <your-repo-url>
cd APEX
npm install
npx playwright install
```

### 3. Configure Intelligence Provider
Create a `.env` file in the root directory. APEX uses a dynamic switch; you can swap LLM providers instantly without touching framework code:

```env
# Choose: groq | google | anthropic | openai
ACTIVE_LLM_PROVIDER=groq
ACTIVE_LLM_MODEL=llama-3.3-70b-versatile

GROQ_API_KEY=gsk_your_groq_api_key_here
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## 🔒 Enterprise Authentication & Session State

Many enterprise applications require authentication. Instead of forcing the AI to log in every time it maps a page, APEX uses Playwright `storageState` to bypass login screens on protected routes.

**Step 1: Generate a Session Token**
Run the auth setup utility. A browser will open—log in manually. The script will wait until you reach your secure dashboard, save your cookies to `framework-core/.auth/state.json`, and close.
```bash
npx tsx framework-core/auth-setup.ts
```
*(Note: Ensure `framework-core/.auth/` is in your `.gitignore` to prevent leaking secure cookies).*

---

## 🔄 The 4-Stage Engineering Lifecycle

### Stage 1: HARVEST (Map the Application)
Spawns a hidden Playwright instance, crawls the target URL, extracts interactive elements, and maps their XPath locators into `framework-core/locators/<page>.yaml`.

**For Public Pages:**
```bash
npm run ai:harvest -- --url="[https://practicetestautomation.com/practice-test-login/](https://practicetestautomation.com/practice-test-login/)"
```

**For Secure/Protected Pages (Using saved Auth State):**
```bash
npm run ai:harvest -- --url="[https://practicetestautomation.com/logged-in-home/](https://practicetestautomation.com/logged-in-home/)" --state="framework-core/.auth/state.json"
```

### Stage 2: AUTHOR (Draft the Test Case)
Open Microsoft Excel / Google Sheets and author your human-readable test steps inside the `test-data/` directory *(See the Excel Standard below for multi-page flows)*.

### Stage 3: GENERATE (Compile the Specs)
Boots the `excelParser` and `fileAstManager` agents. Reads the spreadsheet, generates required TypeScript Page Object methods, and injects a ready-to-run Playwright test suite into the `tests/` directory.

```bash
npm run ai:generate -- --file="test-data/functional_cases.xlsx"
```

### Stage 4: EXECUTE (Run the Automation)
Invokes the standard native Playwright test runner against the generated code.

```bash
# Run silently in background (CI mode)
npx playwright test

# Run visually on your screen (Debug mode)
npx playwright test --headed
```

---

## 📊 The Excel Test Case Standard

The `ai:generate` parser strictly relies on **Row 1** containing the exact column headers defined below. The framework groups steps into individual test files based on the `TestCase_ID`. To create a new test, simply change the ID.

### Trigger Verbs in Action_Description:
* **"Enter"** $\rightarrow$ Triggers `fill()`
* **"Click"** $\rightarrow$ Triggers `click()`
* **"Navigate"** $\rightarrow$ Triggers `goto()`
* **"Verify"** $\rightarrow$ Triggers Playwright `expect()` assertions.

### Canonical Example (`test-data/functional_cases.xlsx`):
*This example shows **two separate test cases** in one sheet. The parser will generate two separate files: `tc_001_e2e_login_validate.spec.ts` and `tc_002_invalid_login_warning.spec.ts`.*

| TestCase_ID | Module_Name | Step_No | Action_Description | Test_Data |
| :--- | :--- | :---: | :--- | :--- |
| `TC_001_E2E_Login_Validate` | `LoginPage` | 1 | Navigate to base application | `https://practicetestautomation.com/practice-test-login/` |
| `TC_001_E2E_Login_Validate` | `LoginPage` | 2 | Enter username | `student` |
| `TC_001_E2E_Login_Validate` | `LoginPage` | 3 | Enter password | `Password123` |
| `TC_001_E2E_Login_Validate` | `LoginPage` | 4 | Click Submit button | |
| `TC_001_E2E_Login_Validate` | `HomePage` | 5 | Verify successful login message is visible | `Logged In Successfully` |
| `TC_001_E2E_Login_Validate` | `HomePage` | 6 | Click Logout button | |
| `TC_001_E2E_Login_Validate` | `LoginPage` | 7 | Verify user is returned to login screen | `https://practicetestautomation.com/practice-test-login/` |
| `TC_002_Invalid_Login_Warning` | `LoginPage` | 1 | Navigate to base application | `https://practicetestautomation.com/practice-test-login/` |
| `TC_002_Invalid_Login_Warning` | `LoginPage` | 2 | Enter username | `student` |
| `TC_002_Invalid_Login_Warning` | `LoginPage` | 3 | Enter password | `WrongPassword999` |
| `TC_002_Invalid_Login_Warning` | `LoginPage` | 4 | Click Submit button | |
| `TC_002_Invalid_Login_Warning` | `LoginPage` | 5 | Verify error message is visible | `Your username is invalid!` |

---

## 🛠️ Extending the Framework

Because APEX uses the Model Context Protocol, adding new capabilities does not require refactoring the CLI. 

1. Create a new server file inside `agents/mcp-servers/` (e.g., `sqlValidator.ts`).
2. Declare your tool inside its `ListToolsRequestSchema` payload.
3. Register the server connection inside `agents/mcp-client/cli.ts` using the `connectToServer()` helper.

---

## ⚠️ Common Troubleshooting

* **Error: `Executable doesn't exist at /Library/Caches/ms-playwright/...`** *Cause:* Playwright NPM wrappers were installed, but the OS-level browser binaries are missing.  
  *Fix:* Run `npx playwright install`.

* **Error: `429 Too Many Requests / Quota Exceeded`** *Cause:* Your free-tier API daily token limit popped on your current active LLM provider.  
  *Fix:* Open `.env` and switch `ACTIVE_LLM_PROVIDER` to an alternative backup provider.