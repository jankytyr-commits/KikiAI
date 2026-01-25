import google.generativeai as genai
import json
import os
from config_loader import get_api_key

# --- KONFIGURACE ---
OUTPUT_FILE = "dostupne_modely.json"

def main():
    # 1. Načtení API klíče
    api_key = get_api_key()
    if not api_key:
        print("❌ Chyba: Nepodařilo se načíst API klíč.")
        return

    genai.configure(api_key=api_key)
    
    print(f"🔍 Dotazuji se Google API na dostupné modely...")
    
    models_list = []
    
    # 2. Stahování dat o modelech
    try:
        # Projdeme všechny dostupné modely
        for m in genai.list_models():
            # Vytvoříme strukturovaný záznam pro JSON
            model_info = {
                "name": m.name,
                "display_name": m.display_name,
                "version": m.version,
                "description": m.description,
                "input_token_limit": m.input_token_limit,
                "output_token_limit": m.output_token_limit,
                "supported_methods": m.supported_generation_methods,
                "temperature_default": m.temperature,
                "top_p_default": m.top_p,
                "top_k_default": m.top_k
            }
            models_list.append(model_info)

    except Exception as e:
        print(f"❌ Chyba při komunikaci s API: {e}")
        return

    # 3. Uložení do JSON
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(models_list, f, ensure_ascii=False, indent=2)
        print(f"✅ Data uložena do souboru: {OUTPUT_FILE}")
    except Exception as e:
        print(f"❌ Chyba při zápisu do souboru: {e}")

    # 4. Výpis do konzole (tabulka)
    print("\n" + "="*85)
    print(f"{'NÁZEV MODELU (ID)':<40} | {'METODY':<20} | {'MAX OUTPUT'}")
    print("-" * 85)
    
    for m in models_list:
        methods = ", ".join([met.replace("generate", "") for met in m['supported_methods']])
        # Zkrátíme výpis metod, aby se vešel
        if len(methods) > 20: methods = methods[:17] + "..."
        
        print(f"{m['name']:<40} | {methods:<20} | {m['output_token_limit']}")
    
    print("="*85)
    print(f"Celkem nalezeno modelů: {len(models_list)}")

if __name__ == "__main__":
    main()