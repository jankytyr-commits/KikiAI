
// HTML Preview Functionality
function showHtmlPreview(previewId) {
    const htmlCode = window.htmlPreviews[previewId];
    if (!htmlCode) {
        alert('HTML kód nenalezen');
        return;
    }

    // Create modal for preview
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const content = document.createElement('div');
    content.style.cssText = 'background:#1a1a1a;border-radius:8px;width:90%;height:90%;max-width:1200px;max-height:800px;display:flex;flex-direction:column;overflow:hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'background:#2c2c2c;padding:1rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #444;';
    header.innerHTML = `
        <h3 style='margin:0;color:#fff;'>HTML Náhled</h3>
        <button onclick='this.closest("div[style*=fixed]").remove()' style='background:#ff6b6b;border:none;color:#fff;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;font-size:1rem;'>× Zavřít</button>
    `;

    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = 'flex:1;overflow:auto;padding:1rem;background:#fff;';

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
    iframe.sandbox = 'allow-scripts'; // Safe sandbox

    iframeContainer.appendChild(iframe);
    content.appendChild(header);
    content.appendChild(iframeContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Write HTML to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlCode);
    iframeDoc.close();
}
