import {test, expect} from '@playwright/test'

test.describe('css selector',() => {
    test('nth element', async ({
      page,
    }) => {
      await page.goto('https://staging.bugplot.com/signin') 
      await page.fill("input:below(:text('Email Address'))","alpha@yopmail.com");
      await page.fill("input:above(:text('Sign in'))","Password@123");
      await page.click("#login-submit")
      await page.locator('project-1>>nth=1').click()
    
    })
})