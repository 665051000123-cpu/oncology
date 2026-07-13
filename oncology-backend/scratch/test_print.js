const puppeteer = require("puppeteer");
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 0; }
        body { 
            font-family: Tahoma, sans-serif; 
            margin: 0; 
            padding: 0;
            font-size: 11px;
            color: #000;
        }
        .sticker {
            width: 8cm;
            height: 5cm;
            padding: 0.2cm 0.4cm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin: 0;
            page-break-after: always;
            border: 1px solid red; /* Just to see it */
        }
    </style>
</head>
<body>
    <div class="sticker">Sticker 1</div>
    <div class="sticker">Sticker 2</div>
</body>
</html>
`;
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({ path: "scratch/test_print.pdf", width: "80mm", height: "50mm" });
    await browser.close();
})();
