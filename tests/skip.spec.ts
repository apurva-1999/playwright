import {test} from '@playwright/test';

test("bugplot",async({browser}) => {
    const context = await browser.newContext({
        storageState:"./auth.json"
    })
    const page =await context.newPage();
    await page.goto("https://staging.bugplot.com")
    await page.waitForTimeout(5000);
})
//npx playwright codegen --save-storage=auth.json
//npx playwright open --load-storage=auth.json https://staging.bugplot.com