import json
import os
import time
import argparse
from pathlib import Path
from google import genai
from google.genai import types 

from config_loader import get_api_key

# --- KONFIGURACE ---
API_KEY = get_api_key()
INPUT_JSON = "kalendar_2026_full.json"
OUTPUT_FOLDER = "kalendar_obrazky"
MODEL_NAME = "imagen-4.0-fast-generate-001" 

def generate_calendar_images(specific_weeks=None, force=False):
    if not API_KEY:
        print("Chyba: API_KEY nebyl nalezen v config.json!")
        return

    client = genai.Client(api_key=API_KEY)
    output_path = Path(OUTPUT_FOLDER)
    output_path.mkdir(exist_ok=True)

    try:
        with open(INPUT_JSON, "r", encoding="utf-8") as f:
            weeks_data = json.load(f)
    except FileNotFoundError:
        print(f"Chyba: Soubor {INPUT_JSON} nebyl nalezen.")
        return

    # Filtrování týdnů
    target_weeks = weeks_data
    if specific_weeks:
        target_weeks = [w for w in weeks_data if w["week_number"] in specific_weeks]

    if not target_weeks:
        print("Žádné týdny k vygenerování.")
        return

    print(f"Začínám generovat {len(target_weeks)} obrázků...")
    
    for week in target_weeks:
        week_num = week["week_number"]
        prompt = week["image_prompt"]
        file_name = f"tyden_{week_num:02d}.png"
        file_path = output_path / file_name

        if file_path.exists() and not force:
            print(f"Přeskakuji: Týden {week_num} již existuje.")
            continue

        print(f"Generuji: Týden {week_num}...")
        
        try:
            response = client.models.generate_images(
                model=MODEL_NAME,
                prompt=prompt,
                config={
                    'number_of_images': 1,
                    'aspect_ratio': '9:16', 
                    'safety_filter_level': 'block_low_and_above'
                }
            )
            
            if response.generated_images:
                image = response.generated_images[0].image
                image.save(file_path)
                print(f"Uloženo: {file_name}")
            else:
                print(f"Varování: Žádný obrázek pro týden {week_num}.")
            
            time.sleep(4) 

        except Exception as e:
            print(f"Chyba u týdne {week_num}: {e}")
            if "404" in str(e):
                break

    print("\nHOTOVO.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='KikiCalendar Image Generator')
    parser.add_argument('--weeks', type=str, help='Seznam týdnů (např. 1,2,5-10)')
    parser.add_argument('--force', action='store_true', help='Přepsat existující soubory')
    args = parser.parse_args()

    weeks_to_gen = None
    if args.weeks:
        weeks_to_gen = set()
        for part in args.weeks.split(','):
            if '-' in part:
                start, end = map(int, part.split('-'))
                weeks_to_gen.update(range(start, end + 1))
            else:
                weeks_to_gen.add(int(part))
    
    generate_calendar_images(specific_weeks=weeks_to_gen, force=args.force)
