import json
import os
import datetime
import argparse
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle, Image, Paragraph, Spacer, PageBreak, BaseDocTemplate, PageTemplate, Frame, NextPageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm

# --- KONFIGURACE ---
DEFAULT_INPUT_JSON = "kalendar_2026_full.json"
IMAGE_FOLDER = "kalendar_obrazky"
ICON_FOLDER = "icons"
BG_FOLDER = "backgrounds"
DEFAULT_OUTPUT_PDF = "kalendar_2026_FINAL_12BG.pdf"
LOCAL_FONT_FILE = "DejaVuSans.ttf" 

def draw_bg_wrapper(bg_filename):
    def draw_bg(canvas, doc):
        canvas.saveState()
        bg_path = os.path.join(BG_FOLDER, bg_filename)
        if os.path.exists(bg_path):
            page_width, page_height = landscape(A4)
            canvas.drawImage(bg_path, 0, 0, width=page_width, height=page_height)
        canvas.restoreState()
    return draw_bg

def create_pdf(input_json=DEFAULT_INPUT_JSON, output_pdf=DEFAULT_OUTPUT_PDF, specific_weeks=None):
    if os.path.exists(LOCAL_FONT_FILE):
        try:
            pdfmetrics.registerFont(TTFont('DejaVu', LOCAL_FONT_FILE))
            FONT_NAME = 'DejaVu'
        except: FONT_NAME = 'Helvetica'
    else: FONT_NAME = 'Helvetica'

    try:
        with open(input_json, "r", encoding="utf-8") as f: 
            weeks = json.load(f)
    except Exception as e:
        print(f"Chyba při načítání JSON: {e}")
        return

    if specific_weeks:
        weeks = [w for w in weeks if w['week_number'] in specific_weeks]

    if not weeks:
        print("Žádná data pro vytvoření PDF.")
        return

    doc = BaseDocTemplate(output_pdf, pagesize=landscape(A4),
                          leftMargin=0.5*cm, rightMargin=0.5*cm,
                          topMargin=0.5*cm, bottomMargin=0.5*cm)

    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')

    templates = []
    for i in range(1, 13):
        bg_file = f"bg_{i:02d}.jpg"
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
        if os.path.exists(path):
            return f'<img src="{path}" width="12" height="12" valign="-2"/> '
        return ""

    elements = []
    print(f"Generuji PDF: {output_pdf} (týdnů: {len(weeks)})...")
    
    for week in weeks:
        date_obj = datetime.datetime.strptime(week['days'][0]['date_full'], "%Y-%m-%d")
        elements.append(NextPageTemplate(f'Month_{date_obj.month:02d}'))

        elements.append(Paragraph(f"<b>{week.get('header_title', '')}</b>", title_style))
        elements.append(Paragraph(f"<i>{week.get('header_info', '')}</i>", subtitle_style))
        
        week_num = week["week_number"]
        img_path = f"{IMAGE_FOLDER}/tyden_{week_num:02d}.png"
        left_content = []
        if os.path.exists(img_path):
            left_content.append(Image(img_path, width=9*cm, height=15.5*cm))
        else:
            left_content.append(Paragraph(f"Obrázek týdne {week_num} chybí", title_style))

        col_widths = [1.2*cm, 0.8*cm, 3.2*cm, 2.3*cm, 3.5*cm, 1.8*cm, 2.6*cm, 2.5*cm]
        header_row = [Paragraph(t, header_style) for t in ["Datum", "Den", "Svátek", "Slunce", "Měsíc", "Zahrada", "Čína", "Poznámka"]]
        data_rows = [header_row]

        for day in week["days"]:
            datum = f"<b>{day['date']}</b>"
            den = day['day_name']
            svatek = f"<b>{day['holiday']}</b><br/>{day['name_day']}" if day['holiday'] else day['name_day']
            slunce = f"{day.get('sun_rise','')} – {day.get('sun_set','')}"
            
            m = day['moon']
            m_icon = "moon_nov.png"
            if "Úplněk" in m['phase']: m_icon = "moon_uplnek.png"
            elif "Dorůstá" in m['phase']: m_icon = "moon_dorusta.png"
            elif "Couvá" in m['phase']: m_icon = "moon_couva.png"
            moon_html = f"<b>{m['sign']}</b> {get_icon_tag(m_icon)} {m['phase']}"
            
            g = day['moon']['garden_type']
            g_icon = f"garden_{g.lower().replace('ě','e').replace('ř','r')}.png" if g != "-" else ""
            # Manual mapping for safety
            g_map = {"Plod":"garden_plod.png", "Kořen":"garden_koren.png", "List":"garden_list.png", "Květ":"garden_kvet.png"}
            g_icon = g_map.get(day['moon']['garden_type'], "")
            garden_html = f"{get_icon_tag(g_icon)} <b>{day['moon']['garden_type']}</b>"
            
            row = [Paragraph(datum, cell_style), Paragraph(den, cell_style), Paragraph(svatek, cell_style),
                   Paragraph(slunce, cell_style), Paragraph(moon_html, cell_style), Paragraph(garden_html, cell_style),
                   Paragraph(f"{day['chinese']['animal']}/{day['chinese']['element']}", cell_style), Paragraph(str(day.get('note','')), cell_style)]
            data_rows.append(row)

        rt = Table(data_rows, colWidths=col_widths, rowHeights=[0.8*cm]+[1.95*cm]*len(week["days"]))
        rt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.25, colors.grey), ('BACKGROUND', (0,0), (-1,-1), colors.white), ('VALIGN', (0,0), (-1,-1), 'TOP')]))

        master = Table([[left_content, rt]], colWidths=[9.5*cm, 18.5*cm])
        elements.append(master)
        elements.append(Spacer(1, 0.2*cm))
        elements.append(Paragraph(week.get('footer_text', ''), footer_style))
        elements.append(PageBreak())

    try:
        doc.build(elements)
        print(f"HOTOVO! PDF uloženo: {output_pdf}")
    except Exception as e:
        print(f"CHYBA při tvorbě PDF: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=DEFAULT_INPUT_JSON)
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PDF)
    parser.add_argument("--weeks", type=str)
    args = parser.parse_args()
    
    w_filter = None
    if args.weeks:
        w_filter = set()
        for p in args.weeks.split(','):
            if '-' in p:
                s, e = map(int, p.split('-'))
                w_filter.update(range(s, e + 1))
            else: w_filter.add(int(p))
            
    create_pdf(args.input, args.output, w_filter)
