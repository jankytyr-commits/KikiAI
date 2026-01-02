import json
import os
import time
from pathlib import Path
from google import genai
from google.genai import types # Import typů pro nastavení bezpečnosti

from config_loader import get_api_key

# --- KONFIGURACE ---
API_KEY = get_api_key()
if not API_KEY:
    print("VĂťstraha: API_KEY nebyl nalezen v config.json!")
INPUT_JSON = "kalendar_2026_full.json"
OUTPUT_FOLDER = "kalendar_obrazky"
# Pokud tento model nepůjde, zkuste "imagen-3.0-generate-001"
MODEL_NAME = "imagen-4.0-fast-generate-001" 

client = genai.Client(api_key=API_KEY)

def generate_calendar_images():
    output_path = Path(OUTPUT_FOLDER)
    output_path.mkdir(exist_ok=True)

    try:
        with open(INPUT_JSON, "r", encoding="utf-8") as f:
            weeks = json.load(f)
    except FileNotFoundError:
        print(f"Chyba: Soubor {INPUT_JSON} nebyl nalezen.")
        return

    print(f"Začínám generovat {len(weeks)} obrázků ve formátu 9:16.")
    
    for week in weeks:
        week_num = week["week_number"]
        prompt = week["image_prompt"]
        file_name = f"tyden_{week_num:02d}.png"
        file_path = output_path / file_name

        if file_path.exists():
            print(f"Přeskakuji: Týden {week_num} již existuje.")
            continue

        print(f"Generuji: Týden {week_num}...")
        
        try:
            # Oprava konfigurace podle chybové hlášky
            response = client.models.generate_images(
                model=MODEL_NAME,
                prompt=prompt,
                config={
                    'number_of_images': 1,
                    'aspect_ratio': '9:16', 
                    'safety_filter_level': 'block_low_and_above' # <--- OPRAVENO
                }
            )
            
            if response.generated_images:
                image = response.generated_images[0].image
                image.save(file_path)
                print(f"Uloženo (9:16): {file_name}")
            else:
                print(f"Varování: Žádný obrázek pro týden {week_num}.")
            
            time.sleep(4) 

        except Exception as e:
            print(f"Chyba u týdne {week_num}: {e}")
            # Pokud model 4.0 nepojede, zkuste změnit MODEL_NAME nahoře na 'imagen-3.0-generate-001'
            if "404" in str(e):
                print("Tip: Zkuste změnit MODEL_NAME v kódu na jinou verzi.")
                break

    print("\nHOTOVO.")

if __name__ == "__main__":
    generate_calendar_images()