import json
import datetime
import swisseph as swe
import ephem
import argparse

# --- KONFIGURACE ---
ROK = 2026
LOKACE_LAT = 50.0755
LOKACE_LON = 14.4378

# --- DATA: JMENINY & SVÁTKY ---
raw_names = [
    "Nový rok/Mečislav,Karina,Radmila,Diana,Dalimil,Tři králové,Vilma,Čestmír,Vladan,Břetislav,Bohdana,Pravoslav,Edita,Radovan,Alice,Ctirad,Drahoslav,Vladislav,Doubravka,Ilona,Běla,Slavomír,Zdeněk,Milena,Miloš,Zora,Ingrid,Otýlie,Zdislava,Robin,Marika",
    "Hynek,Nela,Blažej,Jarmila,Dobromila,Vanda,Veronika,Milada,Apolena,Mojmír,Božena,Slavěna,Věnceslav,Valentýn,Jiřina,Ljuba,Miloslava,Gizela,Patrik,Oldřich,Lenka,Petr,Svatopluk,Matěj,Liliana,Dorota,Alexandr,Lumír",
    "Bedřich,Anežka,Kamil,Stela,Kazimir,Miroslav,Tomáš,Gabriela,Františka,Viktorie,Anděla,Řehoř,Růžena,Rút/Matylda,Ida,Elena,Vlastimil,Eduard,Josef,Světlana,Radek,Leona,Ivona,Gabriel,Marián,Emanuel,Dita,Soňa,Taťána,Arnošt,Kvido",
    "Hugo,Erika,Richard,Ivana,Miroslava,Vendula,Heřman,Ema,Dušan,Darja,Izabela,Julius,Aleš,Vincenc,Anastázie,Irena,Rudolf,Valérie,Rostislav,Marcela,Alexandra,Evženie,Vojtěch,Jiří,Marek,Oto,Jaroslav,Vlastislav,Robert,Blahoslav",
    "Svátek práce,Zikmund,Alexej,Květoslav,Klaudie,Radoslav,Stanislav,Den vítězství,Ctibor,Blažena,Svatava,Pankrác,Servác,Bonifác,Žofie,Přemysl,Aneta,Nataša,Ivo,Zbyšek,Monika,Emil,Vladimír,Jana,Viola,Filip,Valdemar,Vilém,Maxmilián,Ferdinand,Kamila",
    "Laura,Jarmil,Tamara,Dalibor,Dobroslav,Norbert,Iveta,Medard,Stanislava,Gita,Bruno,Antonie,Antonín,Roland,Vít,Zbyněk,Adolf,Milan,Leoš,Květa,Alois,Pavla,Zdeňka,Jan,Ivan,Adriana,Ladislav,Lubomír,Petr a Pavel,Šárka",
    "Jaroslava,Patricie,Radomír,Prokop,Cyril a Metoděj,Mistr Jan Hus,Bohuslava,Nora,Drahoslava,Libuše,Olga,Bořek,Markéta,Karolína,Jindřich,Luboš,Martina,Drahomíra,Čeněk,Ilja,Vítězslav,Magdaléna,Libor,Kristýna,Jakub,Anna,Věroslav,Viktor,Marta,Bořivoj,Ignác",
    "Oskar,Gustav,Miluše,Dominik,Kristián,Oldřiška,Lada,Soběslav,Roman,Vavřinec,Zuzana,Klára,Alena,Alan,Hana,Jáchym,Petra,Helena,Ludvík,Bernard,Johana,Bohuslav,Sandra,Bartoloměj,Radim,Luděk,Otakar,Augustýn,Evelína,Vladěna,Pavlína",
    "Linda,Adéla,Bronislav,Jindřiška,Boris,Boleslav,Regína,Mariana,Daniela,Irma,Denisa,Marie,Lubor,Radka,Jolana,Ludmila,Naděžda,Kryštof,Zita,Oleg,Matouš,Darina,Berta,Jaromír,Zlata,Andrea,Jonáš,Václav,Michal,Jeroným",
    "Igor,Olívie,Bohumil,František,Eliška,Hanuš,Justýna,Věra,Štefan,Marina,Andrej,Marcel,Renáta,Agáta,Tereza,Havel,Hedvika,Lukáš,Michaela,Vendelín,Brigita,Sabina,Teodor,Nina,Beáta,Erik,Šarlota,Den vzniku státu,Silvie,Tadeáš,Štěpánka",
    "Felix,Památka zesnulých,Hubert,Karel,Miriam,Valerie,Saskie,Bohumír,Bohdan,Evžen,Martin,Benedikt,Tibor,Sáva,Leopold,Otmar,Mahulena,Romana,Alžběta,Nikola,Albert,Cecílie,Klement,Emílie,Kateřina,Artur,Xenie,René,Zina,Ondřej",
    "Iva,Blanka,Svatoslav,Barbora,Jitka,Mikuláš,Ambrož,Květoslava,Vratislav,Julie,Dana,Simona,Lucie,Lýdie,Radana,Albína,Daniel,Miloslav,Ester,Dagmar,Natálie,Šimon,Vlasta,Adam a Eva,1. svátek vánoční,Štěpán,Žaneta,Bohumila,Judita,David,Silvestr"
]

JMENINY = {}
for m, month_str in enumerate(raw_names):
    for d, name in enumerate(month_str.split(',')):
        JMENINY[(m + 1, d + 1)] = name

STATNI_SVATKY = {
    (1,1): "Den obnovy státu", (5,1): "Svátek práce", (8,5): "Den vítězství", (5,7): "Cyril a Metoděj",
    (6,7): "Jan Hus", (28,9): "Česká státnost", (28,10): "Vznik ČSR", (17,11): "Den boje za svobodu",
    (24,12): "Štědrý den", (25,12): "1. svátek vánoční", (26,12): "2. svátek vánoční",
    (4,3): "Velký pátek", (4,6): "Velikonoční pondělí" # Rok 2026
}

SPECIAL_EVENTS = {
    (1, 3): "🌕 Vlčí úplněk", (2, 17): "🔥 Začátek roku KONĚ", (3, 3): "🌕 Postní úplněk",
    (3, 20): "Jarní rovnodennost", (4, 30): "Čarodějnice", (6, 21): "Letní slunovrat", (12, 21): "Zimní slunovrat"
}

# --- ČÍNSKÝ KALENDÁŘ (DETAILNÍ - MĚSÍČNÍ PILÍŘE) ---
def get_chinese_month_pillar(jd, year):
    """
    Vypočítá čínský měsíc (zvíře a element) na základě polohy Slunce.
    """
    # Získáme longitudu Slunce
    sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
    
    # Čínské solární měsíce začínají cca 4. den v měsíci (když Slunce vstoupí do znamení)
    # 315° = Začátek Tygra (Únor)
    # 345° = Zajíc (Březen) atd.
    # Posuneme o 45 stupňů, aby 0 byla začátek Krysy (prosinec) pro jednodušší indexování? 
    # Ne, uděláme to tabulkově dle zvěrokruhu.
    
    # Mapování Sluneční long -> Zvíře měsíce
    # Vodnář (300-330) -> konec Buvola, začátek Tygra na 315
    if 315 <= sun_lon < 345: animal = "Tygr"   # Únor
    elif 345 <= sun_lon < 360 or 0 <= sun_lon < 15: animal = "Zajíc" # Březen
    elif 15 <= sun_lon < 45: animal = "Drak"   # Duben
    elif 45 <= sun_lon < 75: animal = "Had"    # Květen
    elif 75 <= sun_lon < 105: animal = "Kůň"   # Červen
    elif 105 <= sun_lon < 135: animal = "Koza" # Červenec
    elif 135 <= sun_lon < 165: animal = "Opice" # Srpen
    elif 165 <= sun_lon < 195: animal = "Kohout" # Září
    elif 195 <= sun_lon < 225: animal = "Pes"    # Říjen
    elif 225 <= sun_lon < 255: animal = "Vepř"   # Listopad
    elif 255 <= sun_lon < 285: animal = "Krysa"  # Prosinec
    else: animal = "Buvol" # Leden (285-315)

    # Element měsíce se odvíjí od Nebeského kmene roku (Year Stem).
    # Rok 2026 je Rok Koně (Oheň Yang - Bing).
    # Pro roky končící na 6 (Bing) začíná Tygr elementem Geng (Kov).
    # Leden 2026 (Buvol) patří ještě k roku 2025 (Yi - Dřevo Yin) -> Měsíc Buvol je Ji (Země).
    
    if year == 2026:
        # Leden (do cca 3.2.) je ještě rok Hada, měsíc Buvol
        if animal == "Buvol": element = "Země" 
        elif animal == "Tygr": element = "Kov"
        elif animal == "Zajíc": element = "Kov"
        elif animal == "Drak": element = "Voda"
        elif animal == "Had": element = "Voda"
        elif animal == "Kůň": element = "Dřevo"
        elif animal == "Koza": element = "Dřevo"
        elif animal == "Opice": element = "Oheň"
        elif animal == "Kohout": element = "Oheň"
        elif animal == "Pes": element = "Země"
        elif animal == "Vepř": element = "Země"
        elif animal == "Krysa": element = "Kov"
    else:
        element = "Neznámý"

    return {"animal": animal, "element": element}

# --- ASTROLOGIE ---
def get_julian_day(date_obj):
    return swe.julday(date_obj.year, date_obj.month, date_obj.day, 12.0)

def get_moon_data(jd):
    moon_lon = swe.calc_ut(jd, swe.MOON)[0][0]
    sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
    
    # Znamení
    zodiacs = ["Beran", "Býk", "Blíženci", "Rak", "Lev", "Panna", "Váhy", "Štír", "Střelec", "Kozoroh", "Vodnář", "Ryby"]
    sign_index = int(moon_lon // 30) % 12
    sign = zodiacs[sign_index]
    
    # Fáze
    diff = (moon_lon - sun_lon) % 360
    if diff < 15 or diff > 345: phase, icon = "Nov", "🌑"
    elif 165 < diff < 195: phase, icon = "Úplněk", "🌕"
    elif 0 < diff < 180: phase, icon = "Dorůstá", "🌔"
    else: phase, icon = "Couvá", "🌖"

    # Zahrada (dle živlu znamení)
    # Oheň/Vzduch -> Květ/Plod, Země/Voda -> Kořen/List
    # Zjednodušeně pro zahradničení:
    elements = ["Plod", "Kořen", "Květ", "List", "Plod", "Kořen", "Květ", "List", "Plod", "Kořen", "Květ", "List"]
    garden_type = elements[sign_index]
    
    return phase, icon, sign, garden_type

# --- TEXTY PATIČKY ---
# Načteme je raději dynamicky nebo použijeme generické, pokud nemáme AI soubor
try:
    with open("data_texts.json", "r", encoding="utf-8") as f:
        AI_TEXTS = json.load(f)
except FileNotFoundError:
    AI_TEXTS = {"astro": {}, "chinese": {}}

def get_footer_text(week_num, c_month_info):
    w_str = str(week_num)
    
    # Pokud máme AI text, použijeme ho
    if w_str in AI_TEXTS.get("astro", {}):
        astro_txt = AI_TEXTS["astro"][w_str]
        china_txt = AI_TEXTS["chinese"][w_str]
    else:
        # Fallback text, ale dynamický podle měsíce!
        astro_txt = f"Slunce putuje zvěrokruhem. Luna ovlivňuje emoce."
        china_txt = f"Vládne měsíc {c_month_info['element']}ho {c_month_info['animal']}e. Zaměřte se na harmonii s tímto elementem."

    return (
        f"<font size='7'>"
        f"<b>ZÁPADNÍ ASTROLOGIE:</b> {astro_txt}<br/>"
        f"<b>ČÍNSKÝ ELEMENT:</b> {china_txt}"
        f"</font>"
    )

# --- TVORBA PROMPTU PRO OBRÁZEK (SPECIFICKÝ) ---
def get_image_prompt(week_num, days, c_month_info):
    """
    Sestaví ultra-specifický prompt pro daný týden.
    Spojuje: Roční období + Čínský měsíc (Zvíře/Element) + Fázi/Znamení Luny + Svátky.
    """
    # 1. Datum a roční období
    mid_day = days[3] # Středa jako střed týdne
    month = int(mid_day["date_full"].split("-")[1])
    
    seasons = {
        1: "Deep winter, snow covered landscape, frozen lake",
        2: "Late winter, melting snow patches, cold air",
        3: "Early spring, snowdrops, mud, first green buds",
        4: "Spring, flowering cherry trees, green grass, dandelions",
        5: "Lush spring, blooming meadows, bright sun",
        6: "Early summer, tall grass, wild strawberries, forest",
        7: "High summer, golden wheat fields, hot sun, blue sky",
        8: "Late summer, harvest, hay bales, ripe fruit",
        9: "Early autumn, morning mist, spiderwebs, heather",
        10: "Autumn, colorful leaves (orange, red), pumpkins",
        11: "Late autumn, bare trees, fog, frost, melancholic",
        12: "Winter, first snow, festive atmosphere, lights"
    }
    season_desc = seasons.get(month, "Nature landscape")

    # 2. Astronomie (Luna ve středu týdne)
    jd = get_julian_day(datetime.datetime.strptime(mid_day["date_full"], "%Y-%m-%d"))
    phase, icon, moon_sign, garden = get_moon_data(jd)
    
    # Vizuál znamení Luny (na obloze)
    zodiac_visuals = {
        "Beran": "Aries constellation in sky", "Býk": "Taurus constellation", "Blíženci": "Gemini stars in sky",
        "Rak": "Cancer constellation", "Lev": "Leo sun symbol in clouds", "Panna": "Virgo constellation",
        "Váhy": "Libra scales cloud shape", "Štír": "Scorpio constellation", "Střelec": "Sagittarius arrow in sky",
        "Kozoroh": "Capricorn constellation", "Vodnář": "Aquarius constellation", "Ryby": "Pisces constellation"
    }
    astro_desc = f"Night sky or clouds showing {zodiac_visuals.get(moon_sign, 'stars')}."
    if phase == "Úplněk":
        astro_desc += " Giant Full Moon illuminating the scene."
    
    # 3. Čínský element a zvíře měsíce (Ne roku!)
    # Příklad: Leden -> Buvol v krajině, Země (skály/pole)
    c_animal = c_month_info['animal']
    c_element = c_month_info['element']
    
    element_visual = {
        "Dřevo": "old twisted trees, roots, forest",
        "Oheň": "warm light, campfire, sunset colors",
        "Země": "rocky terrain, ploughed field, crystals",
        "Kov": "morning frost, metallic cold light, stones",
        "Voda": "river, lake, rain, mist"
    }.get(c_element, "nature")
    
    animal_visual = f"A {c_animal} (symbolic or real) incorporated into the landscape."
    if c_animal == "Drak": animal_visual = "Dragon silhouette in clouds."

    # 4. Svátky a události (Vlajka atd.)
    holidays = " ".join([d['holiday'] for d in days if d['holiday']]).lower()
    events = " ".join([d['note']['text'] for d in days if d['note']['text']]).lower()
    combined = holidays + " " + events
    
    special = ""
    if "obnovy státu" in combined or "státnost" in combined or "vznik čsr" in combined:
        special = "Czech flag fluttering on a pole near a cottage."
    elif "vánoce" in combined or "štědrý" in combined:
        special = "Outdoor Christmas tree with lights, snowy village."
    elif "velikonoce" in combined:
        special = "Basket with painted eggs, pussy willows."
    elif "čarodějnice" in combined:
        special = "Bonfire on a hill at dusk."
    elif "vlčí" in combined: # Vlčí úplněk
        special = "A wolf howling at the moon."
        animal_visual = "" # Vlk přebíjí čínské zvíře

    # Sestavení promptu
    prompt = (
        f"Magical Realism style, highly detailed Czech landscape. "
        f"{season_desc}. "
        f"Centerpiece: {special if special else animal_visual}. "
        f"Environment: {element_visual}. "
        f"Sky: {astro_desc}. "
        f"Soft lighting, cinematic composition."
    )
    
    return prompt

def get_header_info(week_num, days):
    start, end = days[0]['date'], days[-1]['date']
    return f"{week_num}. Týden ({start} – {end})", f"Rok Hada/Koně | Měsíc: {days[3]['chinese_month']['animal']}"

# --- GENERACE ---
def main():
    weeks = []
    curr = datetime.date(ROK, 1, 1)
    end_date = datetime.date(ROK, 12, 31)
    
    # Zarovnání na začátek týdne (pondělí), pokud 1.1. není pondělí,
    # aby první týden v JSONu byl kompletní nebo částečný, jak chceme.
    # Zde jednoduše jedeme po dnech a shlukujeme.
    
    curr_week = -1
    buffer = []

    print(f"Generuji data pro rok {ROK} s detailní čínskou astrologií...")

    while curr <= end_date:
        iso_w = curr.isocalendar()[1]
        
        # Ošetření přelomu roku (týden 52/53/1)
        if curr.month == 1 and iso_w > 50: iso_w = 0 # Hack pro začátek
        
        if iso_w != curr_week and curr_week != -1:
            if buffer:
                # Zpracování předchozího týdne
                # Zjistíme čínský měsíc pro středu tohoto týdne (reprezentativní)
                mid = buffer[3] if len(buffer) > 3 else buffer[0]
                mid_jd = get_julian_day(datetime.datetime.strptime(mid["date_full"], "%Y-%m-%d"))
                c_month_info = get_chinese_month_pillar(mid_jd, ROK)
                
                # Doplníme info do dní (pro jistotu)
                for d in buffer: d['chinese_month'] = c_month_info

                prompt = get_image_prompt(curr_week, buffer, c_month_info)
                footer = get_footer_text(curr_week, c_month_info)
                title, sub = get_header_info(curr_week, buffer)

                weeks.append({
                    "week_number": curr_week,
                    "header_title": title,
                    "header_info": sub,
                    "footer_text": footer,
                    "image_prompt": prompt,
                    "days": buffer
                })
            buffer = []
        
        curr_week = iso_w
        
        # Data pro den
        jd = get_julian_day(curr)
        ph, ic, sn, gd = get_moon_data(jd)
        
        # Čínský měsíc pro každý den (přesnější, ale pro týden stačí jeden)
        # Uděláme to ve fázi uložení týdne, viz výše.
        
        note_txt = ""
        holiday = STATNI_SVATKY.get((curr.month, curr.day), "")
        if holiday: note_txt = holiday
        elif SPECIAL_EVENTS.get((curr.month, curr.day), ""):
            note_txt = SPECIAL_EVENTS.get((curr.month, curr.day))

        buffer.append({
            "date": f"{curr.day}. {curr.month}.",
            "date_full": str(curr),
            "day_name": ["Po","Út","St","Čt","Pá","So","Ne"][curr.weekday()],
            "name_day": JMENINY.get((curr.month, curr.day), ""),
            "holiday": holiday,
            "moon": {"phase": ph, "icon": ic, "sign": sn, "garden_type": gd},
            "note": {"text": note_txt},
            "chinese": {"animal": "Kůň" if curr >= datetime.date(2026,2,17) else "Had"} # Rok
        })
        
        curr += datetime.timedelta(days=1)

    # Poslední týden
    if buffer:
        mid = buffer[0]
        mid_jd = get_julian_day(datetime.datetime.strptime(mid["date_full"], "%Y-%m-%d"))
        c_month_info = get_chinese_month_pillar(mid_jd, ROK)
        for d in buffer: d['chinese_month'] = c_month_info
        
        prompt = get_image_prompt(curr_week, buffer, c_month_info)
        footer = get_footer_text(curr_week, c_month_info)
        title, sub = get_header_info(curr_week, buffer)
        
        weeks.append({
            "week_number": curr_week,
            "header_title": title,
            "header_info": sub,
            "footer_text": footer,
            "image_prompt": prompt,
            "days": buffer
        })

    with open("kalendar_2026_full.json", "w", encoding="utf-8") as f:
        json.dump(weeks, f, ensure_ascii=False, indent=2)

    print("HOTOVO. Data (včetně unikátních promptů a čínských měsíců) uložena.")

if __name__ == "__main__":
    main()