import json
import os
import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Image, Paragraph, Spacer, PageBreak, BaseDocTemplate, PageTemplate, Frame, NextPageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm

# --- KONFIGURACE ---
INPUT_JSON = "kalendar_2026_full.json"
IMAGE_FOLDER = "kalendar_obrazky"
ICON_FOLDER = "icons"
BG_FOLDER = "backgrounds"
OUTPUT_PDF = "kalendar_2026_FINAL_12BG.pdf"
LOCAL_FONT_FILE = "DejaVuSans.ttf" 

# --- FUNKCE PRO VYKRESLENÍ POZADÍ ---
def draw_bg_wrapper(bg_filename):
    """Vrátí funkci, která vykreslí konkrétní obrázek. Potřeba pro ReportLab šablony."""
    def draw_bg(canvas, doc):
        canvas.saveState()
        bg_path = os.path.join(BG_FOLDER, bg_filename)
        if os.path.exists(bg_path):
            page_width, page_height = landscape(A4)
            canvas.drawImage(bg_path, 0, 0, width=page_width, height=page_height)
        canvas.restoreState()
    return draw_bg

def create_pdf():
    if os.path.exists(LOCAL_FONT_FILE):
        try:
            pdfmetrics.registerFont(TTFont('DejaVu', LOCAL_FONT_FILE))
            FONT_NAME = 'DejaVu'
        except: FONT_NAME = 'Helvetica'
    else: FONT_NAME = 'Helvetica'

    try:
        with open(INPUT_JSON, "r", encoding="utf-8") as f: weeks = json.load(f)
    except: return

    # --- PŘÍPRAVA DOKUMENTU A 12 ŠABLON ---
    doc = BaseDocTemplate(OUTPUT_PDF, pagesize=landscape(A4),
                          leftMargin=0.5*cm, rightMargin=0.5*cm,
                          topMargin=0.5*cm, bottomMargin=0.5*cm)

    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')

    # Dynamické vytvoření 12 šablon (Month_01 ... Month_12)
    templates = []
    for i in range(1, 13):
        bg_file = f"bg_{i:02d}.jpg"
        # Vytvoříme PageTemplate, který použije funkci draw_bg_wrapper pro daný soubor
        tmpl = PageTemplate(id=f'Month_{i:02d}', frames=frame, onPage=draw_bg_wrapper(bg_file))
        templates.append(tmpl)

    doc.addPageTemplates(templates)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontName=FONT_NAME, fontSize=16, alignment=0, spaceAfter=0, textColor=colors.black)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontName=FONT_NAME, fontSize=10, alignment=0, spaceAfter=4, textColor=colors.darkslategray)
    cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontName=FONT_NAME, fontSize=8, leading=10)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontName=FONT_NAME, fontSize=8, textColor=colors.black, alignment=0)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontName=FONT_NAME, fontSize=8, alignment=0, textColor=colors.darkslategray, leading=10)

    def get_icon_tag(filename):
        if not filename: return ""
        path = os.path.join(ICON_FOLDER, filename)
        if os.path.exists(path) and os.path.isfile(path):
            return f'<img src="{path}" width="12" height="12" valign="-2"/> '
        return ""

    elements = []

    print("Generuji PDF s 12 měsíčními pozadími...")
    
    for week in weeks:
        # 1. Zjistit měsíc pro tento týden (podle prvního dne v týdnu)
        date_obj = datetime.datetime.strptime(week['days'][0]['date_full'], "%Y-%m-%d")
        month_num = date_obj.month
        
        # 2. Přepnout šablonu (NextPageTemplate aplikuje změnu na TUTO stránku, pokud jsme na začátku)
        elements.append(NextPageTemplate(f'Month_{month_num:02d}'))

        # --- OBSAH ---
        week_num = week["week_number"]
        img_path = f"{IMAGE_FOLDER}/tyden_{week_num:02d}.png"

        elements.append(Paragraph(f"<b>{week.get('header_title', '')}</b>", title_style))
        elements.append(Paragraph(f"<i>{week.get('header_info', '')}</i>", subtitle_style))
        
        left_content = []
        if os.path.exists(img_path):
            img = Image(img_path, width=9*cm, height=15.5*cm) 
            left_content.append(img)
        else:
            left_content.append(Paragraph("Obrázek chybí", title_style))

        # Sloupce
        col_widths = [1.2*cm, 0.8*cm, 3.2*cm, 2.3*cm, 3.5*cm, 1.8*cm, 2.6*cm, 2.5*cm]
        header_row = [
            Paragraph("Datum", header_style), Paragraph("Den", header_style),
            Paragraph("Svátek", header_style), Paragraph("Slunce", header_style),
            Paragraph("Měsíc (Znamení Fáze)", header_style), Paragraph("Zahrada", header_style),
            Paragraph("Čínský den", header_style), Paragraph("Poznámka", header_style)
        ]
        data_rows = [header_row]

        for day in week["days"]:
            datum = f"<b>{day['date']}</b>"
            den = day['day_name']
            svatek = f"<b>{day['holiday']}</b><br/>{day['name_day']}" if day['holiday'] else day['name_day']
            slunce = f"{day.get('sun_rise','')} – {day.get('sun_set','')}"
            
            # Měsíc
            m_phase, m_sign = day['moon']['phase'], day['moon']['sign']
            m_icon_file = "moon_nov.png"
            if "Úplněk" in m_phase: m_icon_file = "moon_uplnek.png"
            elif "Dorůstá" in m_phase: m_icon_file = "moon_dorusta.png"
            elif "Couvá" in m_phase: m_icon_file = "moon_couva.png"
            moon_html = f"<b>{m_sign}</b> {get_icon_tag(m_icon_file)} {m_phase}"
            
            # Zahrada
            g_type = day['moon']['garden_type']
            g_icon_file = ""
            if "Plod" in g_type: g_icon_file = "garden_plod.png"
            elif "Kořen" in g_type: g_icon_file = "garden_koren.png"
            elif "List" in g_type: g_icon_file = "garden_list.png"
            elif "Květ" in g_type: g_icon_file = "garden_kvet.png"
            garden_html = f"{get_icon_tag(g_icon_file)} <b>{g_type}</b>"
            
            # Čína
            china = day['chinese']
            china_txt = f"{china['animal']} / {china['element']}" if isinstance(china, dict) else str(china)

            # Poznámka
            note_raw = day.get('note', '')
            n_text, n_type = "", "none"
            if isinstance(note_raw, dict):
                n_text, n_type = note_raw.get('text', ''), note_raw.get('type', 'none')
            else:
                n_text = str(note_raw)
            
            if n_type == "holiday": note_style = f"<font color='red'><b>{n_text}</b></font>"
            elif n_type == "special": note_style = f"<font color='blue'>{n_text}</font>"
            elif n_type == "astro": note_style = f"<font color='grey'><i>{n_text}</i></font>"
            else: note_style = n_text
            
            row = [
                Paragraph(datum, cell_style), Paragraph(den, cell_style),
                Paragraph(svatek, cell_style), Paragraph(slunce, cell_style),
                Paragraph(moon_html, cell_style), Paragraph(garden_html, cell_style),
                Paragraph(china_txt, cell_style), Paragraph(note_style, cell_style)
            ]
            data_rows.append(row)

        num_days = len(week["days"])
        row_heights = [0.8*cm] + [1.95*cm] * num_days

        right_table = Table(data_rows, colWidths=col_widths, rowHeights=row_heights)
        right_table.setStyle(TableStyle([
            ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
            # Pozadí tabulky BÍLÉ, aby byl text čitelný i na barevném pozadí
            ('BACKGROUND', (0,0), (-1,-1), colors.white), 
            ('fontName', (0,0), (-1,-1), FONT_NAME),
            ('fontSize', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 2),
            ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ]))

        master_table = Table([[left_content, right_table]], colWidths=[9.5*cm, 18.5*cm])
        master_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        
        elements.append(master_table)
        elements.append(Spacer(1, 0.2*cm))

        elements.append(Paragraph(week.get('footer_text', ''), footer_style))
        elements.append(PageBreak())

    try:
        doc.build(elements)
        print(f"HOTOVO! PDF uloženo: {OUTPUT_PDF}")
    except Exception as e:
        print(f"CHYBA: {e}")

if __name__ == "__main__":
    create_pdf()