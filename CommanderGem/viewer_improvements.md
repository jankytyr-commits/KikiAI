# Návrh vylepšení vieweru - CommanderGem

## Přehled změn

### 1. Rozšířený encoding selector

**Umístění:** Toolbar vieweru (vedle Save/Download tlačítek)

**Podporovaná kódování:**
- UTF-8 (default)
- Windows-1250 (čeština, slovenština)
- ISO-8859-2 (Latin-2)
- ASCII (7-bit)
- Hex View (hexadecimální: `00 1A 2B ...`)
- Binary View (binární: `00011010 00101011 ...`)

**Implementace:**
```javascript
function createEncodingSelector() {
  const selector = document.createElement('select');
  selector.id = 'encodingSelector';
  selector.innerHTML = `
    <option value="utf-8">UTF-8</option>
    <option value="windows-1250">Windows-1250 (čeština)</option>
    <option value="iso-8859-2">ISO-8859-2 (Latin-2)</option>
    <option value="ascii">ASCII</option>
    <option value="hex">Hex View</option>
    <option value="binary">Binary View</option>
  `;
  return selector;
}

function renderWithEncoding(arrayBuffer, encoding) {
  const bytes = new Uint8Array(arrayBuffer);
  
  switch(encoding) {
    case 'utf-8':
      return new TextDecoder('utf-8').decode(arrayBuffer);
    
    case 'windows-1250':
      return new TextDecoder('windows-1250').decode(arrayBuffer);
    
    case 'iso-8859-2':
      return new TextDecoder('iso-8859-2').decode(arrayBuffer);
    
    case 'ascii':
      return Array.from(bytes)
        .map(b => b <= 0x7F ? String.fromCharCode(b) : '?')
        .join('');
    
    case 'hex':
      return Array.from(bytes)
        .map((b, i) => {
          const hex = b.toString(16).padStart(2, '0').toUpperCase();
          return (i % 16 === 0 ? '\n' : '') + hex + ' ';
        })
        .join('');
    
    case 'binary':
      return Array.from(bytes)
        .map((b, i) => {
          const bin = b.toString(2).padStart(8, '0');
          return (i % 8 === 0 ? '\n' : '') + bin + ' ';
        })
        .join('');
    
    default:
      return new TextDecoder('utf-8').decode(arrayBuffer);
  }
}
```

### 2. Vylepšené zobrazení speciálních formátů

#### JSON soubory
```javascript
async function showJsonView(file) {
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    
    editorArea.value = formatted;
    editorArea.style.display = 'block';
  } catch(e) {
    editorArea.value = text;
  }
}
```

#### Markdown soubory
```javascript
async function showMarkdownView(file) {
  const text = await file.text();
  const html = simpleMarkdownToHtml(text);
  
  const iframe = document.createElement('iframe');
  iframe.srcdoc = '<style>body{font-family:sans-serif;padding:20px}</style>' + html;
}

function simpleMarkdownToHtml(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>');
}
```

### 3. Metadata pro obrázky

```javascript
async function showImageWithMetadata(file, url) {
  const img = new Image();
  img.src = url;
  
  img.onload = () => {
    const metadata = document.createElement('div');
    metadata.innerHTML = `
      <strong>Rozměry:</strong> ${img.naturalWidth} × ${img.naturalHeight} px<br>
      <strong>Velikost:</strong> ${formatBytes(file.size)}
    `;
  };
}
```

## Priorita implementace

1. **Vysoká priorita:**
   - [x] Encoding selector (UTF-8, Windows-1250, Hex)
   - [x] Hex view pro binární soubory
   - [x] Metadata pro obrázky (rozměry, velikost)

2. **Střední priorita:**
   - [x] JSON formátování
   - [x] XML formátování
   - [x] HTML formátování
   - 📝 Markdown náhled
   - 📝 Volitelně: HEIC podpora (via heic2any) - *Hotovo*

3. **Nízká priorita:**
   - 📝 Zoom pro obrázky
   - 📝 Syntax highlighting
