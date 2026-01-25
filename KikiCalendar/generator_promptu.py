import json
import os
import datetime
from pathlib import Path

# --- KONFIGURACE ---
INPUT_CALENDAR_JSON = "kalendar_2026_full.json"
OUTPUT_PROMPTS_JSON = "prompty_obrazku.json"

# --- MATICE PROSTŘEDÍ (Zkrácená pro lepší integraci) ---
# Popisy prostředí jsem upravil tak, aby začínaly malým písmenem a dalo se před ně dát "standing in/on..."
ELEMENTAL_SCENES = {
    "Winter": { 
        "Voda": "on a frozen river bank with deep blue cracks in the ice, surrounded by snow and cold mist",
        "Dřevo": "in a dense pine forest heavily covered in snow, with dark tree trunks contrasting against white snow",
        "Oheň": "on a vast snowy plain at dusk, illuminated by an intense red and orange sunset reflecting on the snow",
        "Země": "on rocky mountain terrain covered in snow, with frozen bare ground exposed through snow patches",
        # ZDE JE TEN KOV:
        "Kov": "on sharp jagged rocks heavily covered in silver hoarfrost, surrounded by huge icicles looking like crystal blades, under a metallic grey sky"
    },
    # ... Ostatní sezóny (upravil jsem je, aby pasovaly do věty "Zvíře ... v prostředí")
    "Spring": { 
        "Voda": "near a fast flowing clear stream melting the snow, with rain falling on a blooming meadow",
        "Dřevo": "in a fresh green forest with budding branches and sprouting ferns",
        "Oheň": "on wet soil warmed by sun rays, surrounded by bright vibrant tulips and daffodils",
        "Země": "on freshly plowed dark fertile soil, with muddy paths drying in the sun",
        "Kov": "in grass covered with morning dew drops on spiderwebs looking like silver chains and wet shiny stones"
    },
    "Summer": { 
        "Voda": "near a refreshing clear river or pond, with summer storm clouds in distance",
        "Dřevo": "in a dense leafy forest providing shade, under ancient oak trees",
        "Oheň": "in a golden wheat field under high noon sun, with dry heat and poppies",
        "Země": "on a path with sandstones and dust, near ripe harvest fields",
        "Kov": "on dry hot rocks radiating heat, with sharp shadows and a metallic blue sky"
    },
    "Autumn": { 
        "Voda": "near a misty lake, with heavy dew on colorful leaves",
        "Dřevo": "in a forest with leaves turning gold and red, surrounded by mushrooms and moss",
        "Oheň": "illuminated by a sunset on autumn foliage, with warm red and orange tones",
        "Země": "in a harvested field with pumpkins and plowed earth",
        "Kov": "under a cold grey sky, surrounded by bare branches and heavy frost on fallen leaves"
    }
}

CZECH_ANIMALS = {
    "Winter": [
        "A lone Grey Wolf (Vlk)", "A wild Brown Hare (Zajíc polní)", "A Roe Deer (Srnec)", 
        "A Wild Boar (Divoké prase)", "A Red Fox (Liška)", "A Raven (Krkavec)", 
        "An Eagle Owl (Výr velký)", "A Badger (Jezevec)", "A Kingfisher (Ledňáček)"
    ],
    "Spring": [
        "A young Brown Hare (Zajíc)", "A White Stork (Čáp)", "A singing Blackbird (Kos)", 
        "A Hedgehog (Ježek)", "A newborn Fawn (Srnce)", "Blooming butterflies", "A Swallow (Vlaštovka)"
    ],
    "Summer": [
        "A Falcon (Poštolka/Sokol)", "A Lizard (Ještěrka)", "Wild Bees", "A Dragonfly (Vážka)", 
        "A Carp (Kapr)", "A Red Deer (Jelen)"
    ],
    "Autumn": [
        "A Red Deer stag (Jelen v říji)", "A Red Squirrel (Veverka)", "A Pheasant (Bažant)", 
        "A Hedgehog (Ježek)", "Wild Geese", "A Owl (Puštík)"
    ]
}

def has_state_holiday(week_data):
    days = week_data["days"]
    czech_holidays = ["obnovy", "vítězství", "cyril", "hus", "státnost", "vznik", "svobodu", "boj"]
    holidays_text = " ".join([d.get('holiday', '') for d in days if d.get('holiday')]).lower()
    for key in czech_holidays:
        if key in holidays_text: return True
    return False

def create_prompt(week_data):
    days = week_data["days"]
    week_num = week_data["week_number"]
    
    mid_date = datetime.datetime.strptime(days[3]["date_full"], "%Y-%m-%d")
    month = mid_date.month

    holidays_text = " ".join([d.get('holiday', '') for d in days if d.get('holiday')]).lower()
    notes_text = " ".join([str(d.get('note', {}).get('text', '')) for d in days]).lower()
    combined_events = f"{holidays_text} {notes_text}"

    ref_day = days[3]
    if 'chinese_month' in ref_day:
        c_element = ref_day['chinese_month']['element']
    else:
        c_element = "Oheň"

    if month in [12, 1, 2]: season_key = "Winter"
    elif month in [3, 4, 5]: season_key = "Spring"
    elif month in [6, 7, 8]: season_key = "Summer"
    else: season_key = "Autumn"

    # Získání popisu prostředí (začíná předložkou "on", "in", "near"...)
    # Pokud element chybí, fallback na obecný les
    environment_phrase = ELEMENTAL_SCENES.get(season_key, {}).get(c_element, "in a wild nature landscape")

    # HLAVNÍ MOTIV
    subject_phrase = ""
    
    if "vlčí úplněk" in combined_events:
        subject_phrase = "A lone grey wolf howling at the full moon"
        # U speciálních eventů prostředí připojíme volněji, nebo ho přepíšeme, pokud to nedává smysl
        # Tady to necháme, vlk na skále (Kov) nebo v lese (Dřevo) je OK.
    elif "vánoce" in combined_events or "štědrý" in combined_events:
        subject_phrase = "A small illuminated Christmas tree outdoors"
    elif "velikonoce" in combined_events:
        subject_phrase = "Traditional painted Easter eggs in grass"
        environment_phrase = "" # Tady by skála nedávala smysl
    elif "čarodějnice" in combined_events:
        subject_phrase = "A large bonfire silhouette"
    elif "dušičky" in combined_events:
        subject_phrase = "Candle lights on an old stone wall"
        environment_phrase = ""
    else:
        # Výběr zvířete
        animals_list = CZECH_ANIMALS.get(season_key, ["A wild animal"])
        animal_index = week_num % len(animals_list)
        selected_animal = animals_list[animal_index]
        subject_phrase = selected_animal

    # SESTAVENÍ VĚTY: "Subject [stojí/je] v Environment"
    # Pokud máme svátek s vlastním prostředím (Velikonoce), environment_phrase je prázdná
    
    scene_description = ""
    if environment_phrase:
        scene_description = f"{subject_phrase} standing {environment_phrase}."
    else:
        scene_description = f"{subject_phrase}."

    style = (
        "Award-winning National Geographic nature photography, raw photo, 8k resolution, "
        "photorealistic, DSLR, cinematic lighting. "
        "Location: Czech Republic countryside. "
        "NO PEOPLE, NO HUMAN FIGURES, NO TEXT, NO BUILDINGS."
    )

    full_prompt = (
        f"{style} "
        f"SCENE: {scene_description} "
        f"Ensure winter atmosphere with snow and frost." # Pojistka pro zimu
    )

    return full_prompt.strip()

def main():
    print(f"--- FÁZE 1: Generování Promptů (Integrated Sentence) ---")
    if not os.path.exists(INPUT_CALENDAR_JSON): return

    with open(INPUT_CALENDAR_JSON, "r", encoding="utf-8") as f:
        weeks_data = json.load(f)

    prompts_list = []
    print(f"Zpracovávám {len(weeks_data)} týdnů...")
    
    for week in weeks_data:
        prompt = create_prompt(week)
        is_holiday = has_state_holiday(week)
        prompts_list.append({"week_number": week["week_number"], "prompt": prompt, "overlay_flag": is_holiday})
    
    with open(OUTPUT_PROMPTS_JSON, "w", encoding="utf-8") as f:
        json.dump(prompts_list, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Hotovo. Prompty uloženy.")

if __name__ == "__main__":
    main()