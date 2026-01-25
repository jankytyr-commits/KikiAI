import json
import datetime
import swisseph as swe
import time
import google.generativeai as genai
import os

# --- KONFIGURACE ---
ROK = 2026
CONFIG_FILE = "config.json"

# --- 1. NAČTENÍ API KLÍČE A VÝBĚR MODELU ---
try:
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        config = json.load(f)
        API_KEY = config.get("API_KEY")
        if not API_KEY:
            raise ValueError("Klíč API_KEY v config.json chybí.")
        
        # Konfigurace
        genai.configure(api_key=API_KEY)
        
        # --- AUTOMATICKÝ VÝBĚR MODELU ---
        # Získáme seznam všech dostupných modelů pro tento API klíč
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
        
        if not available_models:
            raise ValueError("Nebyly nalezeny žádné dostupné modely pro generování textu.")
            
        # Vybereme preferované (Flash je nejrychlejší, Pro je nejkvalitnější)
        # Zkusíme najít 'flash' nebo 'pro', jinak vezmeme první dostupný
        chosen_model = available_models[0]
        for m_name in available_models:
            if 'flash' in m_name:
                chosen_model = m_name
                break
            if 'pro' in m_name and 'vision' not in m_name: # vision modely někdy neumí čistý text
                chosen_model = m_name
                
        print(f"✅ Nalezené modely: {available_models}")
        print(f"👉 Automaticky vybrán model: {chosen_model}")
        
        model = genai.GenerativeModel(chosen_model)

except Exception as e:
    print(f"❌ CHYBA: Nastavení API selhalo. ({e})")
    exit()

# --- 2. VÝPOČTY PLANET (SWISS EPHEMERIS) ---
def get_julian_day(date_obj):
    return swe.julday(date_obj.year, date_obj.month, date_obj.day, 12.0)

def get_planet_sign_name(jd, planet_id):
    res = swe.calc_ut(jd, planet_id)
    lon = res[0][0]
    zodiacs = ["Beran", "Býk", "Blíženci", "Rak", "Lev", "Panna", "Váhy", "Štír", "Střelec", "Kozoroh", "Vodnář", "Ryby"]
    return zodiacs[int(lon // 30) % 12]

def get_moon_phase(jd):
    moon = swe.calc_ut(jd, swe.MOON)[0][0]
    sun = swe.calc_ut(jd, swe.SUN)[0][0]
    diff = (moon - sun) % 360
    if diff < 15 or diff > 345: return "Nov"
    if 165 < diff < 195: return "Úplněk"
    if 0 < diff < 180: return "Dorůstá"
    return "Couvá"

def get_week_context(date_obj):
    jd = get_julian_day(date_obj)
    
    sun = get_planet_sign_name(jd, swe.SUN)
    moon = get_planet_sign_name(jd, swe.MOON)
    phase = get_moon_phase(jd)
    jupiter = get_planet_sign_name(jd, swe.JUPITER)
    saturn = get_planet_sign_name(jd, swe.SATURN)
    c_animal = "Ohnivý Kůň" if date_obj >= datetime.date(2026, 2, 17) else "Dřevěný Had"
    
    return {
        "sun": sun, "moon": moon, "phase": phase,
        "jupiter": jupiter, "saturn": saturn,
        "chinese_animal": c_animal,
        "month": date_obj.month
    }

# --- 3. GENERUJEME TEXTY POMOCÍ AI ---
def generate_content(week_num, ctx):
    prompt_astro = (
        f"Jsi zkušený astrolog. Napiš horoskop na {week_num}. týden roku {ROK}."
        f"\nDATA: Slunce ve znamení {ctx['sun']}, Měsíc v {ctx['moon']}, fáze {ctx['phase']}."
        f"\nKONTEXT 2026: Saturn je v {ctx['saturn']}, Jupiter v {ctx['jupiter']}."
        f"\nZADÁNÍ: Napiš čtivý, hluboký odstavec (cca 60 slov) o energii týdne. Zmiň vliv Slunce a Luny."
        f" Na závěr přidej jednu krátkou, údernou 'Afirmaci týdne'."
        f"\nJAZYK: Čeština. Nepoužívej odrážky, piš v celých větách."
    )

    prompt_china = (
        f"Jsi expert na Tradiční čínskou medicínu (TČM). Je {week_num}. týden roku {ROK}."
        f"\nVLÁDCE ROKU: {ctx['chinese_animal']}."
        f"\nMĚSÍC V ROCE: {ctx['month']}."
        f"\nZADÁNÍ: Napiš doporučení (cca 60 slov). Jak sladit energii roku ({ctx['chinese_animal']}) s aktuálním měsícem?"
        f" Doporuč konkrétní orgán k posílení, vhodnou chuť/stravu a barvu týdne."
        f"\nJAZYK: Čeština. Nepoužívej odrážky, piš plynulý text."
    )

    try:
        # Volání Gemini
        res_astro = model.generate_content(prompt_astro)
        text_astro = res_astro.text.strip().replace("**", "")
        
        res_china = model.generate_content(prompt_china)
        text_china = res_china.text.strip().replace("**", "")
        
        return text_astro, text_china

    except Exception as e:
        print(f"⚠️ Chyba při generování (Týden {week_num}): {e}")
        # Vrátíme placeholder, aby se skript nezastavil
        return "Energie týdne je stabilní.", "Doporučujeme klidový režim."

# --- HLAVNÍ SMYČKA ---
def main():
    print(f"🚀 Startuji generátor horoskopů...")
    
    weekly_astro = {}
    weekly_chinese = {}
    
    curr = datetime.date(ROK, 1, 1)
    end = datetime.date(ROK, 12, 31)
    curr_week = -1
    
    while curr <= end:
        iso_w = curr.isocalendar()[1]
        
        # Ošetření: API může selhat, pokud pošleme moc dotazů rychle
        # Generujeme jen pro nový týden
        if iso_w != curr_week and str(iso_w) not in weekly_astro:
            curr_week = iso_w
            ctx = get_week_context(curr)
            
            print(f"⏳ Týden {iso_w}: {ctx['sun']} / {ctx['chinese_animal']}...")
            
            astro_txt, china_txt = generate_content(iso_w, ctx)
            
            weekly_astro[str(iso_w)] = astro_txt
            weekly_chinese[str(iso_w)] = china_txt
            
            # Bezpečná pauza 2 sekundy (Google Free Tier má limity)
            time.sleep(2) 
            
        curr += datetime.timedelta(days=1)

    # Uložení
    data = {"astro": weekly_astro, "chinese": weekly_chinese}
    
    with open("data_texts.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ HOTOVO! Data uložena do 'data_texts.json'.")

if __name__ == "__main__":
    main()