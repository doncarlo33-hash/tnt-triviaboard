import puppeteer from 'puppeteer';

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  
  // Host page
  const hostPage = await browser.newPage();
  
  // Display page
  const displayPage = await browser.newPage();
  displayPage.on('console', msg => console.log('DISPLAY BROWSER LOG:', msg.type(), msg.text()));
  displayPage.on('pageerror', err => console.log('DISPLAY BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to host screen...");
  await hostPage.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  
  console.log("Navigating to display screen...");
  await displayPage.goto('http://localhost:5173/?display=true', { waitUntil: 'networkidle2' });
  
  console.log("Waiting 2 seconds...");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking a board card on host screen...");
  await hostPage.evaluate(() => {
    const cells = document.querySelectorAll('.question-cell');
    if (cells.length > 0) {
      cells[0].click();
    }
  });

  console.log("Waiting 4 seconds...");
  await new Promise(r => setTimeout(r, 4000));
  
  console.log("Done.");
  await browser.close();
}

run().catch(console.error);
