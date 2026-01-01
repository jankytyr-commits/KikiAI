import json
import datetime
import ephem
import random

# --- KONFIGURACE ---
ROK = 2026
LOKACE = ephem.Observer()
LOKACE.lat, LOKACE.lon = '50.0755', '14.4378'
LOKACE.elevation = 200

# --- DATA ---
raw_names = [
    "Mečislav/Nový rok,Karina,Radmila,Diana,Dalimil,Tři králové,Vilma,Čestmír,Vladan,Břetislav,Bohdana,Pravoslav,Edita,Radovan,Alice,Ctirad,Drahoslav,Vladislav,Doubravka,Ilona,Běla,Slavomír,Zdeněk,Milena,Miloš,Zora,Ingrid,Otýlie,Zdislava,Robin,Marika",
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
    (4,3): "Velký pátek", (4,6): "Velikonoční pondělí"
}

# --- SPECIÁLNÍ UDÁLOSTI (Fixní) ---
SPECIAL_EVENTS = {
    (1, 5): "❄️ Začátek vlády Buvola",
    (1, 6): "Konec ván. prázdnin",
    (2, 2): "Hromnice", (4, 30): "Čarodějnice", (11, 1): "Dušičky"
}

# --- GENERÁTOR NÁHODNÝCH ASTRO UDÁLOSTÍ (Pro plnější tabulku) ---
def get_random_astro():
    events = [
        "Merkur v sextilu", "Venuše vstupuje do Ryb", "Konjunkce Luna-Mars",
        "Trigon Slunce-Jupiter", "Opozice Saturn", "Meteorický roj",
        "Zodiakální světlo", "Slunce v konjunkci", "Aktivní den",
        "Klidný den", "Pozor na úrazy", "Vhodné pro meditaci"
    ]
    # Vrátí událost jen s 30% pravděpodobností, aby to nebylo přeplácané, 
    # nebo zvyšte pravděpodobnost, pokud chcete plnější.
    if random.random() > 0.6: 
        return random.choice(events)
    return ""

# --- FUNKCE ---
def get_moon_data(date):
    m = ephem.Moon(date)
    const = ephem.constellation(m)[0]
    mapping = {'Ari':('Beran','Plod'), 'Tau':('Býk','Kořen'), 'Gem':('Blíženci','Květ'), 'Cnc':('Rak','List'), 'Leo':('Lev','Plod'), 'Vir':('Panna','Kořen'), 'Lib':('Váhy','Květ'), 'Sco':('Štír','List'), 'Sgr':('Střelec','Plod'), 'Cap':('Kozoroh','Kořen'), 'Aqr':('Vodnář','Květ'), 'Psc':('Ryby','List'), 'Oph':('Štír','List')}
    sign, garden_type = mapping.get(const, ('Neznámé','-'))
    garden_icons = {"Plod":"🍎", "Kořen":"🥕", "Květ":"🌸", "List":"🍃", "-":""}
    garden_icon = garden_icons.get(garden_type, "")
    perc = m.phase
    prev = ephem.Moon(ephem.Date(date)-0.1)
    if perc<2: phase, icon="Nov","🌑"
    elif perc>98: phase, icon="Úplněk","🌕"
    else:
        trend = "Dorůstá" if m.phase > prev.phase else "Couvá"
        icon = "🌔" if trend == "Dorůstá" else "🌖"
        phase = trend
    return phase, icon, sign, garden_type, garden_icon

def get_chinese(date):
    diff = (date - datetime.date(1900,1,31)).days
    e_cz, e_en = ["Dřevo","Dřevo","Oheň","Oheň","Země","Země","Kov","Kov","Voda","Voda"], ["Wood","Wood","Fire","Fire","Earth","Earth","Metal","Metal","Water","Water"]
    a_cz = ["Krysa","Buvol","Tygr","Zajíc","Drak","Had","Kůň","Koza","Opice","Kohout","Pes","Vepř"]
    return {"animal":a_cz[diff%12], "element":e_cz[diff%10]}

def get_weekly_advice(days):
    """Generuje extra dlouhý text (cca 4-5 vět)."""
    phases = [d['moon']['phase'] for d in days]
    dom_phase = max(set(phases), key=phases.count)
    gardens = [d['moon']['garden_type'] for d in days]
    dom_garden = max(set(gardens), key=gardens.count)
    
    # 1. Energie týdne
    if "Dorůstá" in dom_phase:
        part1 = "Energie týdne narůstá, což podporuje nové začátky, učení a fyzickou aktivitu. Tělo efektivněji vstřebává živiny, proto dbejte na kvalitní stravu a vitamíny. "
    elif "Couvá" in dom_phase:
        part1 = "Týden je ideální pro dokončování restů, úklid a detoxikaci organismu. Vše, čeho se nyní zbavíte, odejde snadněji – ať už jde o kila navíc nebo staré zvyky. "
    else:
        part1 = "Tento týden je ovlivněn silnou fází Měsíce (Nov či Úplněk), což může přinést emoční výkyvy. Dopřejte si více klidu a nevysilujte se. "

    # 2. Zahrada a Domácnost
    if "Kořen" in dom_garden:
        part2 = "V zahradě věnujte péči půdě a kořenovému systému. Doma je vhodný čas na opravy a práce spojené se základy či podlahami. "
    elif "Plod" in dom_garden:
        part2 = "Zaměřte se na plody své práce, a to doslova i metaforicky. Vhodné dny pro zavařování, pečení a kreativní tvorbu, která má přinést výsledek. "
    elif "List" in dom_garden:
        part2 = "Rostliny potřebují zálivku. V domácnosti se věnujte praní prádla, skvrny půjdou lépe dolů. Pozor na vlhkost v bytě. "
    elif "Květ" in dom_garden:
        part2 = "Dny vhodné pro péči o krásu, přesazování květin a společenská setkání. Vše, co nyní uděláte pro svůj vzhled, bude mít dvojnásobný efekt. "
    
    # 3. Psychika a Zdraví (Extra text)
    part3 = "Po psychické stránce se snažte udržet balanc. Pokud cítíte únavu, nepřemáhejte se. Večery věnujte četbě nebo lehkému protažení páteře. Nezapomínejte na dostatečný pitný režim, který je v těchto dnech klíčový pro regeneraci."

    return f"{part1}{part2}{part3}"

def get_header_info(week_num, days):
    start, end = days[0]['date'], days[-1]['date']
    title = f"{week_num}. Týden ({start} – {end})"
    
    start_date = datetime.datetime.strptime(days[0]["date_full"], "%Y-%m-%d")
    month_names = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"]
    
    # Znamení
    d, m = start_date.day, start_date.month
    if (m==1 and d>=21) or (m==2 and d<=19): zodiac = "Vodnář"
    elif (m==2 and d>=20) or (m==3 and d<=20): zodiac = "Ryby"
    elif (m==3 and d>=21) or (m==4 and d<=20): zodiac = "Beran"
    elif (m==4 and d>=21) or (m==5 and d<=21): zodiac = "Býk"
    elif (m==5 and d>=22) or (m==6 and d<=21): zodiac = "Blíženci"
    elif (m==6 and d>=22) or (m==7 and d<=22): zodiac = "Rak"
    elif (m==7 and d>=23) or (m==8 and d<=22): zodiac = "Lev"
    elif (m==8 and d>=23) or (m==9 and d<=22): zodiac = "Panna"
    elif (m==9 and d>=23) or (m==10 and d<=23): zodiac = "Váhy"
    elif (m==10 and d>=24) or (m==11 and d<=22): zodiac = "Štír"
    elif (m==11 and d>=23) or (m==12 and d<=21): zodiac = "Střelec"
    else: zodiac = "Kozoroh"
    z_icon = {"Kozoroh":"♑","Vodnář":"♒","Ryby":"♓","Beran":"♈","Býk":"♉","Blíženci":"♊","Rak":"♋","Lev":"♌","Panna":"♍","Váhy":"♎","Štír":"♏","Střelec":"♐"}.get(zodiac,"")
    
    chinese_anim = days[0]['chinese']['animal']
    return title, f"{month_names[start_date.month-1]} | {z_icon} {zodiac} | Čínský měsíc: {chinese_anim}"

# --- GENERACE ---
# Prompt funkce zůstává stejná (zkráceno pro přehlednost)
def generate_image_prompt(date, element_en, week_num):
     return "Prompt placeholder" # Zde by byl váš plný prompt kód

weeks = []
curr, end = datetime.date(ROK, 1, 1), datetime.date(ROK, 12, 31)
curr_week, buffer = -1, []

while curr <= end:
    iso_w = curr.isocalendar()[1]
    if iso_w != curr_week:
        if buffer:
            title, subtitle = get_header_info(curr_week, buffer)
            weeks.append({"week_number":curr_week, "header_title":title, "header_info":subtitle, "footer_text":get_weekly_advice(buffer), "image_prompt":"...", "days":buffer})
        curr_week, buffer = iso_w, []

    LOKACE.date = curr.strftime('%Y/%m/%d 12:00:00')
    sun = ephem.Sun(LOKACE)
    rise = LOKACE.previous_rising(sun).datetime() + datetime.timedelta(hours=1) 
    set_ = LOKACE.next_setting(sun).datetime() + datetime.timedelta(hours=1)
    ph, ic, sn, gd_type, gd_icon = get_moon_data(LOKACE.date)
    chi = get_chinese(curr)
    
    # Logika pro poznámku: Buď speciální fixní, nebo náhodná astro
    fix_note = SPECIAL_EVENTS.get((curr.month, curr.day), "")
    final_note = fix_note if fix_note else get_random_astro()
    
    buffer.append({
        "date": f"{curr.day}. {curr.month}.", "date_full": str(curr),
        "day_name": ["Po","Út","St","Čt","Pá","So","Ne"][curr.weekday()],
        "name_day": JMENINY.get((curr.month, curr.day), ""),
        "holiday": STATNI_SVATKY.get((curr.month, curr.day), ""),
        "sun_rise": f"{rise.hour:02}:{rise.minute:02}",
        "sun_set": f"{set_.hour:02}:{set_.minute:02}",
        "moon": {"phase":ph, "icon":ic, "sign":sn, "garden_type":gd_type, "garden_icon":gd_icon},
        "chinese": chi,
        "note": final_note 
    })
    curr += datetime.timedelta(days=1)

if buffer:
    title, subtitle = get_header_info(curr_week, buffer)
    weeks.append({"week_number":curr_week, "header_title":title, "header_info":subtitle, "footer_text":get_weekly_advice(buffer), "image_prompt":"...", "days":buffer})

with open(f"kalendar_{ROK}_full.json", "w", encoding="utf-8") as f:
    json.dump(weeks, f, ensure_ascii=False, indent=2)
print("Data s Astro fillerem a dlouhou patičkou hotova.")