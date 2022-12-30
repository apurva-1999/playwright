import {test, expect} from '@playwright/test'

test.describe('relative selector',() => {
    test('login check', async ({
      page,
    }) => {
      await page.goto('https://besttalent.vercel.app/signin') 
      await page.fill("input:below(:text('Email address'))","employer@yopmail.com");
      await page.fill("#password:above(:text('Sign in'))","Password@123");
      await page.click("a:above(:text('Sign in'))")
      expect(page.url()).toBe("https://besttalent.vercel.app/forgot-password")
    
    })
  })
//right-of,left-of,near (based on js location concept)
//:right-of(selector) - Matches elements that are to the right of any element matching the inner selector.
//:left-of(selector) - Matches elements that are to the left of any element matching the inner selector.
//:above(selector) - Matches elements that are above any of the elements matching the inner selector.
//:below(selector) - Matches elements that are below any of the elements matching the inner selector.
//:near(selector) - Matches elements that are near (within 50 CSS pixels) any of the elements matching the inner selector.