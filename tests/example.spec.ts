import { chromium, test} from '@playwright/test'; // import test from playwright in chrome so that no compile time error is there

test('best talent intro page', async () => { //we have used async  and await so that we do not have to follow the typical way of writing in javascript
  const browser = await chromium.launch(); //browser launch
  const context = await browser.newContext(); // it opeates multiple independent  browser context
  const page = await context.newPage(); //new tab
  await page.goto("https://besttalent.vercel.app/"); //url visit
  await page.hover("text=Job seeker")
  await page.click("text=Create Job seeker Account") //use alias as ("'create job seeker account'")
  await page.fill("input[id='name']","abcd")
  await page.fill("input[id='username']","abcd@yopmail.com")
  await page.fill("input[id='phoneNumber']","111111111")
  await page.locator('#submit-btn').click();
  
  

})

