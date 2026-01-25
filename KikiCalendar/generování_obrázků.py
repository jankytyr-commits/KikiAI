import json
import os
import time
import argparse
from pathlib import Path
from google import genai
from PIL import Image, ImageDraw

from config_loader import get_api_keys

# --- KONFIGURACE ---
KEYS = get_api_keys()
INPUT_PROMPTS_JSON = "prompty_obrazku.json"
OUTPUT_FOLDER = "kalendar_obrazky"
FLAG_IMAGE_PATH = "vlajka.png"
MODEL_NAME = "imagen-4.0-fast-generate-001"

CURRENT_KEY_TYPE = "free"
if not KEYS or not KEYS.get("free"):
    CURRENT_KEY_TYPE = "paid"

# --- FUNKCE PRO VLAJKU ---
def add_flag_from_disk(background_path):
    if not os.path.exists(FLAG_IMAGE_PATH): return
    try:
        bg = Image.open(background_path).convert("RGBA")
        flag = Image.open(FLAG_IMAGE_PATH).convert("RGBA")
        bg_w, bg_h = bg.size
        target_w = int(bg_w * 0.18)
        aspect_ratio = flag.height / flag.width
        target_h = int(target_w * aspect_ratio)
        flag = flag.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Oprava průhlednosti
        r, g, b, a = flag.split()
        a = a.point(lambda i: int(i * 0.8)) # 20% zprůhlednění
        flag.putalpha(a)
        
        margin = int(bg_w * 0.05)
        x = bg_w - target_w - margin
        y = bg_h - target_h - margin
        bg.paste(flag, (x, y), flag)
        bg.convert("RGB").save(background_path)
        print(f"   🇨🇿 Vlajka přidána.")
    except Exception as e:
        print(f"   ❌ Chyba vlajky: {e}")

# --- GENERACE OBRÁZKŮ ---
def get_client(key_type):
    if not KEYS or not KEYS.get(key_type): return None
    return genai.Client(api_key=KEYS[key_type])

def generate_images(specific_weeks=None, force=False):
    global CURRENT_KEY_TYPE
    print(f"\n--- FÁZE 2: Generování obrazů z JSONu ({MODEL_NAME}) ---")
    
    if not Path(INPUT_PROMPTS_JSON).exists():
        print(f"❌ Chyba: Soubor '{INPUT_PROMPTS_JSON}' neexistuje.")
        print(f"   👉 Nejprve spusťte 'generator_promptu.py'.")
        return

    print(f"-> Načítám prompty z: {INPUT_PROMPTS_JSON}")
    print(f"🔑 Startuji s klíčem: {CURRENT_KEY_TYPE.upper()}")

    if not KEYS: 
        print("❌ Žádné API klíče v configu.")
        return

    try:
        with open(INPUT_PROMPTS_JSON, "r", encoding="utf-8") as f: prompts_data = json.load(f)
    except Exception as e:
        print(f"❌ Chyba při čtení JSONu: {e}")
        return

    output_path = Path(OUTPUT_FOLDER)
    output_path.mkdir(exist_ok=True)
    
    target_items = prompts_data
    if specific_weeks: target_items = [i for i in prompts_data if i["week_number"] in specific_weeks]

    client = get_client(CURRENT_KEY_TYPE)

    for item in target_items:
        week_num = item["week_number"]
        file_path = output_path / f"tyden_{week_num:02d}.png"

        if file_path.exists() and not force:
            print(f"⏭️  Týden {week_num} hotov.")
            continue

        print(f"📷 Týden {week_num} (Klíč: {CURRENT_KEY_TYPE})...")
        
        attempts = 0
        max_attempts = 2
        
        while attempts < max_attempts:
            try:
                if not client: raise ValueError(f"Klient ({CURRENT_KEY_TYPE}) není inicializován.")
                
                response = client.models.generate_images(
                    model=MODEL_NAME,
                    prompt=item["prompt"],
                    config={'number_of_images': 1, 'aspect_ratio': '9:16', 'safety_filter_level': 'block_low_and_above', 'person_generation': 'allow_adult'}
                )
                
                if response.generated_images:
                    response.generated_images[0].image.save(file_path)
                    if item.get("overlay_flag"): add_flag_from_disk(file_path)
                    else: print("   ✅ Uloženo.")
                    break
                else:
                    print(f"   ⚠️ API nevrátilo obrázek (Content Policy?).")
                    break 
            
            except Exception as e:
                err_msg = str(e)
                print(f"   ❌ Chyba: {err_msg}")
                
                is_limit_error = "429" in err_msg or "403" in err_msg or "Exhausted" in err_msg or "Quota" in err_msg
                is_billing_error = "billed" in err_msg or ("400" in err_msg and "INVALID_ARGUMENT" in err_msg)
                
                if is_limit_error or is_billing_error:
                    if CURRENT_KEY_TYPE == "free" and KEYS.get("paid"):
                        print("   ⚠️ PŘEPÍNÁM NA PAID TIER. 💸")
                        CURRENT_KEY_TYPE = "paid"
                        client = get_client("paid")
                        attempts += 1
                        continue
                    else: 
                        print("   ❌ Konec pokusů (žádný další klíč).")
                        return 
                else: 
                    # Jiná chyba (404 atd.)
                    break
        
        # Pauza mezi požadavky
        time.sleep(4) 

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Exekutor obrázků pro kalendář.")
    parser.add_argument('--weeks', type=str, help='Specifické týdny (např. 1-5, 10)')
    parser.add_argument('--force', action='store_true', help='Přegenerovat existující obrázky')
    
    args = parser.parse_args()

    weeks_to_gen = None
    if args.weeks:
        weeks_to_gen = set()
        for part in args.weeks.split(','):
            if '-' in part:
                s, e = map(int, part.split('-'))
                weeks_to_gen.update(range(s, e + 1))
            else: weeks_to_gen.add(int(part))

    generate_images(specific_weeks=weeks_to_gen, force=args.force)