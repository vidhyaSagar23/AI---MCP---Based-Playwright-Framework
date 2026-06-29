import { chromium } from 'playwright';
import path from 'path';

async function generateAuthState() {
    console.log("🌍 Launching browser for manual authentication...");
    const browser = await chromium.launch({ headless: false }); // Must be visible so you can log in
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to your enterprise login page
    await page.goto('https://practicetestautomation.com/practice-test-login/');

    console.log("⏳ Please log in manually in the browser window.");
    console.log("⏳ Waiting for navigation to the secure dashboard...");

    // Wait until the URL changes to the protected route
    await page.waitForURL('**/logged-in-successfully/', { timeout: 60000 });

    // Save the cookies and local storage
    const statePath = path.resolve(process.cwd(), 'framework-core/.auth/state.json');
    await context.storageState({ path: statePath });

    console.log(`✅ Authentication saved successfully to: ${statePath}`);
    await browser.close();
}

generateAuthState().catch(console.error);