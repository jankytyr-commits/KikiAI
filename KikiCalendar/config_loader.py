import json
import os

CONFIG_FILE = "config.json"

def get_api_keys():
    """
    Načte oba API klíče z konfiguračního souboru.
    Vrací slovník: {"free": "...", "paid": "..."}
    """
    if not os.path.exists(CONFIG_FILE):
        print(f"❌ Chyba: Soubor {CONFIG_FILE} nenalezen.")
        return None

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            
        keys = {
            "free": config.get("API_KEY_FREE"),
            "paid": config.get("API_KEY_PAID")
        }
        
        # Fallback pro zpětnou kompatibilitu, kdyby tam byl starý klíč "API_KEY"
        if not keys["free"] and config.get("API_KEY"):
            keys["free"] = config.get("API_KEY")
            
        return keys

    except Exception as e:
        print(f"❌ Chyba při čtení configu: {e}")
        return None