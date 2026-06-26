import { test as base } from '@playwright/test';

// Define the types for our globally available Page Objects
type MyFixtures = {
    // 🤖 AI WILL INJECT NEW PAGE OBJECT TYPES HERE automatically
};

export const test = base.extend<MyFixtures>({
    // 🤖 AI WILL INJECT NEW PAGE OBJECT INITIALIZATIONS HERE automatically
});

export { expect } from '@playwright/test';