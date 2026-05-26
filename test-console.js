import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log("Navigating to http://localhost:5173?display=true...");
  await page.goto('http://localhost:5173?display=true', { waitUntil: 'networkidle2' });
  
  // Wait a moment for any async errors
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
}

run().catch(console.error);
