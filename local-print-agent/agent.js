const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const ptp = require('pdf-to-printer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. Fetch Printers API
app.get('/api/printers', (req, res) => {
    exec('powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name"', (error, stdout, stderr) => {
        if (error) {
            console.error('Fetch Printers Error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch printers' });
        }
        try {
            const printers = stdout.split('\n').map(p => p.trim()).filter(p => p.length > 0);
            res.json(printers);
        } catch (err) {
            console.error('Parse Printers Error:', err);
            res.status(500).json({ success: false, message: 'Failed to parse printers' });
        }
    });
});

// 2. Print API
app.post('/api/print', async (req, res) => {
    try {
        const { html, printerName, paperSize = 'A4' } = req.body;
        
        if (!printerName) {
            return res.status(400).json({ success: false, message: 'Printer name is required' });
        }

        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        // Strip out any <script> tags
        const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        await page.setContent(cleanHtml, { waitUntil: 'domcontentloaded' });

        let pdfOptions = {
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        };

        if (paperSize === 'Sticker') {
            pdfOptions.width = '80mm';
            pdfOptions.height = '50mm';
        } else if (paperSize === 'A5') {
            pdfOptions.format = 'A5';
        } else {
            pdfOptions.format = 'A4';
        }

        const pdfBuffer = await page.pdf(pdfOptions);
        await browser.close();

        // Write buffer to a temp file
        const tempFilename = `temp_print_${crypto.randomBytes(4).toString('hex')}.pdf`;
        const tempPath = path.join(__dirname, tempFilename);
        fs.writeFileSync(tempPath, pdfBuffer);

        // Print using pdf-to-printer
        await ptp.print(tempPath, { printer: printerName });

        // Clean up temp file after some time
        setTimeout(() => {
            try {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            } catch (e) {
                console.error('Failed to clean up temp file:', e);
            }
        }, 15000);

        res.json({ success: true, message: 'Printed successfully on Local Agent' });
    } catch (err) {
        console.error('Print Error:', err);
        res.status(500).json({ success: false, message: 'Failed to print: ' + err.message });
    }
});

const PORT = 5005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🖨️  Oncology Local Print Agent is running!`);
    console.log(`🌐 API is available at http://localhost:${PORT}`);
    console.log(`⚠️  DO NOT CLOSE THIS WINDOW if you want to print!`);
    console.log(`====================================================`);
});
