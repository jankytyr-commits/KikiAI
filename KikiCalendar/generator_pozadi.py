import os
import time
import io
from PIL import Image
from google import genai

# --- KONFIGURACE ---
API_KEY = "AIzaSyAW_ksUT4eJPqGIW8sKdEYNuaHb3uSlkUc" 
OUTPUT_DIR = "backgrounds"
MODEL_NAME = "imagen-4.0-fast-generate-001" 

client = genai.Client(api_key=API_KEY)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- PROMPTY: Styl "Vintage Botanical Stationery" ---
# Chceme syté barvy, protože je následně v Pythonu "utlumíme" bílou vrstvou.
base_style = "Vintage botanical stationery paper texture, decorative borders, elegant watercolor illustration, top view, high quality art. Theme: "

prompts = {
    "bg_01.jpg": base_style + "Winter frost, pine cones, ice blue crystals, white snow.",
    "bg_02.jpg": base_style + "Bare branches, melting snow, early snowdrops, grey and brown tones.",
    "bg_03.jpg": base_style + "Spring meadow, fresh green grass, daisies, soft yellow sun.",
    "bg_04.jpg": base_style + "April rain, blooming tulips, fresh pastel green and pink.",
    "bg_05.jpg": base_style + "Cherry blossoms, sakura tree branches, romantic pink and white petals.",
    "bg_06.jpg": base_style + "Summer garden, strawberries, red poppies, sunny blue sky.",
    "bg_07.jpg": base_style + "Golden wheat stalks, sunflowers, warm yellow and orange harvest.",
    "bg_08.jpg": base_style + "Late summer herbs, lavender, dried grass, warm ochre tones.",
    "bg_09.jpg": base_style + "Apples, grapes, fading green leaves, harvest colors.",
    "bg_10.jpg": base_style + "Colorful autumn leaves, maple, oak, vibrant orange and red.",
    "bg_11.jpg": base_style + "Misty forest, brown mushrooms, fallen leaves, foggy grey atmosphere.",
    "bg_12.jpg": base_style + "Holly branches, red berries, mistletoe, festive winter green and red."
}

def make_watermark(image_bytes, filename):
    """Vytvoří vodoznak smícháním originálu s bílou barvou."""
    # 1. Načíst originál (sytý)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    
    # 2. Vytvořit bílou plochu stejné velikosti
    white_layer = Image.new("RGBA", img.size, (255, 255, 255, 255))
    
    # 3. SMÍCHÁNÍ (Blending)
    # alpha=0.85 znamená: 85% bílé, 15% původního obrázku.
    # Toto zachová barvy, ale udělá je velmi jemné (pastelové), ideální pod text.
    # Pokud chcete obrázky výraznější, snižte číslo na 0.75 nebo 0.70.
    blended = Image.blend(img, white_layer, alpha=0.80)
    
    # Uložení jako JPEG (musíme převést zpět na RGB)
    save_path = os.path.join(OUTPUT_DIR, filename)
    blended.convert("RGB").save(save_path, "JPEG", quality=95)
    print(f" -> Uloženo (Watermark efekt): {filename}")

def generate_backgrounds():
    print("--- GENERUJI 12 VINTAGE POZADÍ (Metoda White Blend) ---")
    
    for filename, prompt in prompts.items():
        file_path = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(file_path):
            print(f"Pozadí {filename} již existuje, přeskakuji.")
            continue
            
        print(f"Generuji {filename}...")
        try:
            # Generujeme Landscape
            response = client.models.generate_images(
                model=MODEL_NAME,
                prompt=prompt,
                config={
                    'number_of_images': 1, 
                    'aspect_ratio': '4:3', 
                    'safety_filter_level': 'block_low_and_above'
                }
            )
            
            if response.generated_images:
                make_watermark(response.generated_images[0].image.image_bytes, filename)
            else:
                print("CHYBA: Model nevrátil obrázek.")
            
            time.sleep(4)
        except Exception as e:
            print(f"CHYBA API: {e}")

if __name__ == "__main__":
    generate_backgrounds()