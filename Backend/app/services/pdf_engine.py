import io
import re
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm
from reportlab.lib import colors

UNICODE_SUBS = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
}

UNICODE_SUPERS = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
}

def clean_and_format_text(text: str, is_question: bool = False) -> str:
    """Cleans DB text, strips old numbers, and formats ALL subscripts/superscripts"""
    if not text:
        return ""
    
    text = str(text).strip()
    
    # 1. THE DELETION RULE: Strips "1.", "12.", etc. at the start
    if is_question:
        text = re.sub(r'^\d{1,2}\.\s*', '', text)
        
    # 2. Prevent ReportLab from crashing on stray XML symbols
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # 3. Clean up weird database artifacts
    text = text.replace(r'^{\wedge}', '^').replace(r'\wedge', '^').replace(r'^{\circ}', '°')
    
    # 4. INTERCEPT UNICODE SUBSCRIPTS & SUPERSCRIPTS
    for uni_char, normal_char in UNICODE_SUBS.items():
        text = text.replace(uni_char, f'<sub>{normal_char}</sub>')
    for uni_char, normal_char in UNICODE_SUPERS.items():
        text = text.replace(uni_char, f'<super>{normal_char}</super>')

    # 5. Fallback for manual markdown formats (^2 or _{2})
    text = re.sub(r'\^\{([^}]+)\}', r'<super>\1</super>', text)
    text = re.sub(r'\^([0-9a-zA-Z+-]+)', r'<super>\1</super>', text)
    text = re.sub(r'_\{([^}]+)\}', r'<sub>\1</sub>', text)
    text = re.sub(r'_([0-9a-zA-Z+-]+)', r'<sub>\1</sub>', text)

    # 6.  SMART CHEMISTRY FORMATTER 
    # Matches chemical charges at the end of words (e.g., SO42- becomes SO4<super>2-</super>)
    text = re.sub(r'(?<=[A-Za-z0-9])(\d?[+-])(?=\s|$|\.|,|\))', r'<super>\1</super>', text)
    # Matches chemical subscripts (e.g., H2O becomes H<sub>2</sub>O)
    text = re.sub(r'([A-Z][a-z]?)(\d+)', r'\1<sub>\2</sub>', text)
    
    return text

def generate_pdf_bytes(questions: list, doc_type: str, two_column: bool, show_extra_info: bool) -> bytes:
    buffer = io.BytesIO()
    styles = getSampleStyleSheet()
    
    # --- STYLES ---
    normal_style = styles['Normal']
    normal_style.fontSize = 10
    normal_style.leading = 14
    
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'],
        textColor=colors.HexColor("#1e293b"), alignment=1 
    )
    
    wish_style = ParagraphStyle(
        'WishStyle', parent=styles['Normal'],
        textColor=colors.HexColor("#059669"), alignment=1, fontSize=12, spaceAfter=15, fontName="Helvetica-Bold"
    )
    
    options_style = ParagraphStyle(
        'Options', parent=normal_style, leftIndent=20, spaceBefore=3, spaceAfter=3
    )
    
    id_style = ParagraphStyle(
        'IDStyle', parent=normal_style, fontSize=8, textColor=colors.gray, spaceAfter=2
    )

    meta_style = ParagraphStyle(
        'Meta', parent=normal_style, fontSize=8, textColor=colors.gray, spaceBefore=4
    )

    # --- LAYOUT ENGINE ---
    # Keys always get a standard 1-column layout so we can draw the 5-column grid!
    if two_column and doc_type != 'Keys':
        doc = BaseDocTemplate(buffer, pagesize=A4)
        frame1 = Frame(doc.leftMargin, doc.bottomMargin, doc.width/2 - 6, doc.height, id='col1')
        frame2 = Frame(doc.leftMargin + doc.width/2 + 6, doc.bottomMargin, doc.width/2 - 6, doc.height, id='col2')
        doc.addPageTemplates([PageTemplate(id='twoCol', frames=[frame1, frame2])])
    else:
        doc = SimpleDocTemplate(buffer, pagesize=A4)

    story = []

    # --- HEADERS ---
    story.append(Paragraph(f"Exam Engine - {doc_type}", title_style))
    story.append(Paragraph("All the Best!", wish_style))

    # --- DOCUMENT GENERATION ---
    
    # Helper to draw images cleanly for both Questions and Solutions
    def inject_images(q_obj):
        if not getattr(q_obj, 'has_image', False):
            return
            
        for img_attr in ['image_path', 'image2_path']:
            img_path_str = getattr(q_obj, img_attr, None)
            if img_path_str:
                # Joins "frontend/public" with "images/filename.png"
                full_path = os.path.join("frontend", "public", img_path_str)
                if os.path.exists(full_path):
                    # Draws image keeping aspect ratio
                    img = Image(full_path, width=6*cm, height=6*cm, kind='proportional')
                    img.hAlign = 'LEFT'
                    story.append(img)
                    story.append(Spacer(1, 0.2 * cm))
                else:
                    story.append(Paragraph(f"<i>[Image missing on disk: {img_path_str}]</i>", meta_style))

    
    # 1. KEYS (Dense 5-Column Grid Layout)
    if doc_type == 'Keys':
        grid_data = []
        current_row = []
        
        for index, q in enumerate(questions, 1):
            ans = getattr(q, 'correct_option', 'N/A')
            current_row.append(f"{index}. {ans}")
            
            if len(current_row) == 5:
                grid_data.append(current_row)
                current_row = []
                
        if current_row:
            while len(current_row) < 5:
                current_row.append("") 
            grid_data.append(current_row)
            
        if grid_data:
            key_table = Table(grid_data, colWidths=[3.2 * cm] * 5)
            key_table.setStyle(TableStyle([
                ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 10),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey)
            ]))
            story.append(key_table)

    # 2. QUESTIONS & SOLUTIONS
    else:
        for index, q in enumerate(questions, 1):
            
            # Isolated ID Line (Completely apart from the question)
            story.append(Paragraph(f"[Question ID: {q.question_id}]", id_style))
            
            if doc_type == 'Questions':
                # Question Text
                q_text = clean_and_format_text(getattr(q, 'question_text', ''), is_question=True)
                story.append(Paragraph(f"<b>{index}.</b> {q_text}", normal_style))
                story.append(Spacer(1, 0.1 * cm))
                
                # THE IMAGE INJECTOR 
                inject_images(q)
                
                # Options
                if getattr(q, 'option_a', None): story.append(Paragraph(f"(A) {clean_and_format_text(q.option_a)}", options_style))
                if getattr(q, 'option_b', None): story.append(Paragraph(f"(B) {clean_and_format_text(q.option_b)}", options_style))
                if getattr(q, 'option_c', None): story.append(Paragraph(f"(C) {clean_and_format_text(q.option_c)}", options_style))
                if getattr(q, 'option_d', None): story.append(Paragraph(f"(D) {clean_and_format_text(q.option_d)}", options_style))
                
                # Extra Info
                if show_extra_info:
                    meta_text = f"<i>Year: {q.year} | Topic: {q.topic} | Diff: {q.difficulty} | PUC: {q.puc_level}</i>"
                    story.append(Paragraph(meta_text, meta_style))
                    
                story.append(Spacer(1, 0.4 * cm))

            elif doc_type == 'Solutions':
                sol_text = clean_and_format_text(getattr(q, 'solution_text', 'No solution provided in database.'))
                ans = getattr(q, 'correct_option', 'N/A')
                
                story.append(Paragraph(f"<b>{index}.</b> Answer: <b>{ans}</b>", normal_style))
                story.append(Spacer(1, 0.1 * cm))
                
                #  THE IMAGE INJECTOR 
                inject_images(q)
                
                story.append(Paragraph(f"{sol_text}", options_style))
                
                if show_extra_info:
                    meta_text = f"<i>Year: {q.year} | Topic: {q.topic}</i>"
                    story.append(Paragraph(meta_text, meta_style))
                    
                story.append(Spacer(1, 0.4 * cm))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes