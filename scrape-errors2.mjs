import puppeteer from 'puppeteer';

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to host screen...");
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  
  console.log("Waiting 2 seconds...");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking a board card...");
  // Find the first question cell and click it
  await page.evaluate(() => {
    const cells = document.querySelectorAll('.question-cell');
    if (cells.length > 0) {
      console.log("Found cell, clicking...");
      cells[0].click();
    } else {
      console.log("No cells found");
    }
  });

  console.log("Waiting 3 seconds...");
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("Done.");
  await browser.close();
}

run().catch(console.error);
