const modelData = {
    'gemini': {
        name: 'Gemini 2.0 Flash',
        description: 'Nejnovější standardní model od Google. Velmi rychlý, efektivní a s obrovským kontextovým oknem (1M tokenů).',
        pros: [
            'Extrémní rychlost',
            'Obrovské kontextové okno (1M tokenů)',
            'Multimodální (text, obrázky, video, audio)',
            'Výborný poměr cena/výkon'
        ],
        cons: [
            'Může být méně kreativní než Pro verze',
            'Občasné halucinace u velmi specifických faktů'
        ],
        useCases: ['Analýza dlouhých dokumentů', 'Rychlý chat', 'Práce s videem/audio', 'Sumarizace']
    },
    'gemini-2.0-flash-exp': {
        name: 'Gemini 2.0 Flash (Experimental)',
        description: 'Experimentální verze nejnovějšího Flash modelu. Obsahuje nejnovější vylepšení, která ještě nejsou ve stabilní verzi.',
        pros: [
            'Přístup k nejnovějším funkcím',
            'Často chytřejší než stabilní verze',
            'Stejná rychlost jako Flash'
        ],
        cons: [
            'Může být nestabilní',
            'Funkce se mohou měnit bez varování'
        ],
        useCases: ['Testování nových schopností', 'Vývojáři', 'Early adopters']
    },
    'gemini-2.0-flash-thinking': {
        name: 'Gemini 2.0 Flash Thinking',
        description: 'Speciální verze modelu Flash schopná "přemýšlet" (reasoning). Dokáže řešit složité logické úlohy krok za krokem.',
        pros: [
            'Výrazně lepší v logice a matematice',
            'Vysvětluje svůj myšlenkový postup',
            'Méně náchylný k chybám v úsudku'
        ],
        cons: [
            'Pomalejší než standardní Flash',
            'Může generovat delší odpovědi'
        ],
        useCases: ['Matematika', 'Programování', 'Složité logické problémy', 'Plánování']
    },
    'gemini-2.5': {
        name: 'Gemini 1.5 Pro (Legacy)',
        description: 'Předchozí generace Pro modelu. Stále velmi schopný, ale pomalejší než řada 2.0.',
        pros: [
            'Ověřená kvalita',
            'Velké kontextové okno (2M tokenů)'
        ],
        cons: [
            'Pomalejší než Flash',
            'Dražší provoz (pokud není free tier)'
        ],
        useCases: ['Kreativní psaní', 'Složité instrukce', 'Legacy projekty']
    },
    'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        description: 'Stabilní verze 1.5 Pro. Výkonný model pro náročné úkoly.',
        pros: [
            'Vysoká inteligence',
            'Kontext 2M tokenů',
            'Stabilní výstupy'
        ],
        cons: [
            'Pomalejší odezva'
        ],
        useCases: ['Komplexní analýza', 'Kreativní psaní', 'Coding']
    },
    'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        description: 'Předchozí generace lehkého modelu. Rychlý a levný.',
        pros: [
            'Rychlost',
            'Efektivita'
        ],
        cons: [
            'Méně schopný než 2.0 Flash'
        ],
        useCases: ['Jednoduché dotazy', 'Rychlé sumarizace']
    },
    'openai': {
        name: 'GPT-4o',
        description: 'Vlajková loď OpenAI. Multimodální model s vysokou inteligencí.',
        pros: [
            'Špičková kvalita odpovědí',
            'Výborný v kódování a logice',
            'Multimodální'
        ],
        cons: [
            'Vysoká cena/limity',
            'Často přetížený (Quota Exceeded)'
        ],
        useCases: ['Všeobecné použití', 'Kódování', 'Kreativní psaní']
    },
    'openai-test': {
        name: 'GPT-4o Mini',
        description: 'Menší a rychlejší verze GPT-4o. Ideální pro běžné úkoly.',
        pros: [
            'Velmi rychlý',
            'Levný provoz',
            'Překvapivě schopný na svou velikost'
        ],
        cons: [
            'Nezvládá velmi složité logické úlohy',
            'Menší kontext'
        ],
        useCases: ['Chatboti', 'Rychlé dotazy', 'E-maily']
    },
    'claude': {
        name: 'Claude 3 Haiku',
        description: 'Nejrychlejší model od Anthropic. Velmi stručný a k věci.',
        pros: [
            'Extrémní rychlost',
            'Velmi levný',
            'Lidský styl psaní'
        ],
        cons: [
            'Méně inteligentní než Opus/Sonnet',
            'Malé kontextové okno v této verzi'
        ],
        useCases: ['Rychlé odpovědi', 'Zákaznická podpora']
    },
    'claude-haiku': {
        name: 'Claude 3.5 Haiku',
        description: 'Vylepšená verze Haiku. Chytřejší a stále velmi rychlá.',
        pros: [
            'Lepší v kódování než 3.0',
            'Rychlost'
        ],
        cons: [
            'Stále "malý" model'
        ],
        useCases: ['Kódování', 'Analýza textu']
    },
    'mistral': {
        name: 'Mistral Small',
        description: 'Efektivní open-weights model od Mistral AI.',
        pros: [
            'Dobrá kvalita pro běžné úkoly',
            'Evropský původ (GDPR friendly)'
        ],
        cons: [
            'Menší znalostní báze',
            'Slabší v češtině než Gemini/GPT'
        ],
        useCases: ['Jednoduché úkoly', 'Angličtina']
    },
    'mistral-large': {
        name: 'Mistral Large',
        description: 'Největší model od Mistral AI. Konkurent GPT-4.',
        pros: [
            'Vysoká inteligence',
            'Silný v logice'
        ],
        cons: [
            'Dražší/pomalejší'
        ],
        useCases: ['Složité problémy', 'Alternativa k GPT-4']
    }
};

function showModelInfo(provider) {
    const data = modelData[provider];
    if (!data) return;

    document.getElementById('modelInfoTitle').textContent = data.name;

    const body = document.getElementById('modelInfoBody');
    body.innerHTML = `
        <div class="model-info-grid">
            <div class="model-description">
                ${data.description}
            </div>
            
            <div class="info-section">
                <h4>Výhody</h4>
                <ul class="pros-list">
                    ${data.pros.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>

            <div class="info-section">
                <h4>Nevýhody/Limity</h4>
                <ul class="cons-list">
                    ${data.cons.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>

            <div class="info-section">
                <h4>Vhodné použití</h4>
                <div class="use-cases">
                    ${data.useCases.map(u => `<span class="use-case-tag">${u}</span>`).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('modelInfoModal').style.display = 'flex';
}

function closeModelInfoModal() {
    document.getElementById('modelInfoModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('modelInfoModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
    // Keep existing logic for apiKeysModal if present in other files, 
    // or duplicate here if needed, but usually window.onclick overwrites.
    // Better to use event listener if possible, but for now this is simple.
    const apiModal = document.getElementById('apiKeysModal');
    if (event.target == apiModal) {
        apiModal.style.display = "none";
    }
}
