import puppeteer from 'puppeteer';

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:5175/...");
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2' });
  
  console.log("Waiting 3 seconds...");
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log("Saved screenshot.png");
  
  await browser.close();
}

run().catch(console.error);
