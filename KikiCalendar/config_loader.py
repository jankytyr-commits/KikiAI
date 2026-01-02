import json
import os
from pathlib import Path

def load_config():
    config_path = Path(__file__).parent / "config.json"
    template_path = Path(__file__).parent / "config.template.json"
    
    if not config_path.exists():
        if template_path.exists():
            print(f"Chyba: Soubor {config_path.name} nebyl nalezen. PouĹľijte {template_path.name} jako vzor.")
        else:
            print(f"Chyba: KonfiguraÄŤnĂ­ soubor nebyl nalezen.")
        return {}
        
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Chyba pĹ™i naÄŤĂ­tĂˇnĂ­ konfigurace: {e}")
        return {}

def get_api_key():
    config = load_config()
    return config.get("API_KEY", "")
