import os
import time
import io  # <--- DŮLEŽITÝ NOVÝ IMPORT
from PIL import Image
from google import genai
from google.genai import types

from config_loader import get_api_key

# --- KONFIGURACE ---
API_KEY = get_api_key()
if not API_KEY:
    print("VĂťstraha: API_KEY nebyl nalezen v config.json!")

OUTPUT_DIR = "icons"
MODEL_NAME = "imagen-4.0-fast-generate-001" 

client = genai.Client(api_key=API_KEY)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- DEFINICE IKON ---
icons_to_generate = {
    "garden_plod.png": "Small minimalist watercolor illustration of a single red apple, isolated on white background, cute art style.",
    "garden_koren.png": "Small minimalist watercolor illustration of a single orange carrot, isolated on white background, cute art style.",
    "garden_list.png": "Small minimalist watercolor illustration of a single green leaf, isolated on white background, cute art style.",
    "garden_kvet.png": "Small minimalist watercolor illustration of a single purple flower head, isolated on white background, cute art style.",
    "moon_nov.png": "Small minimalist watercolor illustration of a new moon (dark indigo circle), isolated on white background.",
    "moon_uplnek.png": "Small minimalist watercolor illustration of a full moon (bright glowing yellow circle), isolated on white background.",
    "moon_dorusta.png": "Small minimalist watercolor illustration of a waxing crescent moon (right half illuminated), golden yellow, isolated on white background.",
    "moon_couva.png": "Small minimalist watercolor illustration of a waning crescent moon (left half illuminated), golden yellow, isolated on white background."
}

def generate_icon(filename, prompt):
    print(f"Generuji ikonu (Imagen 4): {filename}...")
    try:
        response = client.models.generate_images(
            model=MODEL_NAME,
            prompt=prompt,
            config={
                'number_of_images': 1, 
                'aspect_ratio': '1:1',
                'safety_filter_level': 'block_low_and_above'
            }
        )
        
        if response.generated_images:
            # --- OPRAVA ZDE ---
            # Získáme surový objekt z Google knihovny
            google_image_obj = response.generated_images[0].image
            
            # Vytáhneme z něj bajty (image_bytes) a otevřeme je v PIL
            image_bytes = google_image_obj.image_bytes
            img = Image.open(io.BytesIO(image_bytes))
            
            # Teď už je to PIL objekt a má metodu thumbnail
            img.thumbnail((128, 128), Image.Resampling.LANCZOS)
            
            # Uložení
            file_path = os.path.join(OUTPUT_DIR, filename)
            img.save(file_path, "PNG")
            print(f" -> OK: Uloženo jako {filename}")
        else:
            print(f" -> CHYBA: Model nevrátil žádný obrázek.")
            
        time.sleep(4) 
        
    except Exception as e:
        print(f" -> CHYBA API u {filename}: {e}")

# --- HLAVNÍ SMYČKA ---
print("--- ZAČÍNÁM GENEROVAT MAGICKÉ IKONY (FIXED) ---")

for filename, prompt in icons_to_generate.items():
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        generate_icon(filename, prompt)
    else:
        print(f"Ikona {filename} již existuje, přeskakuji.")

print("\n--- HOTOVO ---")