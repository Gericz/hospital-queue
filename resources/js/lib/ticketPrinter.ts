/**
 * Bulletproof Thermal Ticket Printing Utility
 * Uses an isolated hidden iframe with self-contained styles to guarantee
 * crisp, reliable printing on POS thermal roll printers (58mm/80mm) and desktop printers.
 */
export function printThermalElement(
    elementOrId: HTMLElement | string = 'printable-thermal-ticket',
    paperWidth: '58mm' | '80mm' = '80mm'
): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const targetEl =
                typeof elementOrId === 'string'
                    ? document.getElementById(elementOrId)
                    : elementOrId;

            if (!targetEl) {
                console.warn('Thermal print target element not found:', elementOrId);
                // Fallback to standard window print
                window.print();
                resolve(true);
                return;
            }

            const htmlContent = targetEl.innerHTML;
            const widthCss = paperWidth === '58mm' ? '58mm' : '80mm';

            // Remove any existing print iframes
            const existingFrame = document.getElementById('thermal-print-iframe');
            if (existingFrame) {
                existingFrame.remove();
            }

            // Create invisible iframe
            const iframe = document.createElement('iframe');
            iframe.id = 'thermal-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            document.body.appendChild(iframe);

            const frameDoc = iframe.contentWindow?.document;
            if (!frameDoc) {
                window.print();
                resolve(true);
                return;
            }

            frameDoc.open();
            frameDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Queue Ticket Slip</title>
                    <style>
                        @page {
                            margin: 0;
                            size: ${widthCss} auto;
                        }
                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        body {
                            margin: 0 auto;
                            padding: 4px 6px;
                            width: ${widthCss};
                            max-width: ${widthCss};
                            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
                            background-color: #ffffff;
                            color: #000000;
                            font-size: ${paperWidth === '58mm' ? '11px' : '13px'};
                            line-height: 1.25;
                            text-align: center;
                        }
                        div, p, span, h1, h2, h3 {
                            color: #000000 !important;
                        }
                        svg {
                            display: block;
                            margin: 0 auto;
                            max-width: 100%;
                            height: auto;
                        }
                        .border, .border-b, .border-y-2, .border-t {
                            border-color: #000000 !important;
                        }
                    </style>
                </head>
                <body>
                    <div style="width: 100%; margin: 0 auto;">
                        ${htmlContent}
                    </div>
                </body>
                </html>
            `);
            frameDoc.close();

            // Wait for images / svgs inside iframe to load then print
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    resolve(true);
                } catch (e) {
                    console.error('Print iframe error:', e);
                    window.print();
                    resolve(false);
                } finally {
                    setTimeout(() => {
                        iframe.remove();
                    }, 2000);
                }
            }, 300);
        } catch (err) {
            console.error('Failed to trigger print:', err);
            window.print();
            resolve(false);
        }
    });
}
