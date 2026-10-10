from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
navy = colors.HexColor('#173248')
teal = colors.HexColor('#087F8C')
body = ParagraphStyle('body', fontName='Helvetica', fontSize=10.1, leading=13.2, textColor=navy, spaceAfter=7)
heading = ParagraphStyle('heading', parent=body, fontName='Helvetica-Bold', fontSize=10.4, textColor=teal, spaceBefore=4, spaceAfter=4)
title = ParagraphStyle('title', parent=heading, fontSize=20, leading=23, textColor=navy, spaceAfter=7)
story = []
for line in (ROOT / 'docs/design/design-one-page.md').read_text().splitlines():
    if not line.strip(): continue
    style = title if line.startswith('# ') else heading if line.startswith('## ') else body
    text = line.lstrip('# ').replace('→', ' / ').replace('×', 'x')
    story.append(Paragraph(escape(text), style))
def footer(c, doc):
    c.setStrokeColor(teal); c.line(36, 30, A4[0]-36, 30)
    c.setFont('Helvetica', 8); c.setFillColor(navy)
    c.drawString(36, 18, 'Propuesta de diseño | 10 octubre 2026 | Sin secretos')
    c.drawRightString(A4[0]-36, 18, str(doc.page))
SimpleDocTemplate(str(OUT/'reto-1-diseno.pdf'), pagesize=A4, rightMargin=36, leftMargin=36, topMargin=30, bottomMargin=40).build(story, onFirstPage=footer, onLaterPages=footer)

c=canvas.Canvas(str(OUT/'reto-1-arquitectura.pdf'), pagesize=landscape(A4))
W,H=landscape(A4)
c.setFillColor(navy);c.setFont('Helvetica-Bold',22);c.drawString(35,H-48,'Operador visual: arquitectura propuesta')
c.setFont('Helvetica',10);c.drawString(35,H-68,'Reto 1 | API asíncrona + worker aislado + transporte VNC | Manuel Argüelles Guerra')
def box(x,y,w,h,name,lines,color=navy):
    c.setFillColor(colors.HexColor('#F2F7FA'));c.setStrokeColor(color);c.roundRect(x,y,w,h,8,fill=1,stroke=1)
    c.setFillColor(color);c.setFont('Helvetica-Bold',11);c.drawString(x+12,y+h-22,name)
    c.setFont('Helvetica',9)
    for i,t in enumerate(lines):c.drawString(x+12,y+h-40-i*13,t)
def arrow(x1,y1,x2,y2,label=''):
    from math import atan2,cos,sin,pi
    c.setStrokeColor(teal);c.setLineWidth(1.5);c.line(x1,y1,x2,y2)
    a=atan2(y2-y1,x2-x1)
    for sign in (-1,1):c.line(x2,y2,x2-7*cos(a+sign*pi/6),y2-7*sin(a+sign*pi/6))
    c.setFillColor(teal);c.setFont('Helvetica',8);c.drawCentredString((x1+x2)/2,(y1+y2)/2+8,label)
box(35,382,180,95,'Evaluador / usuario',['Bearer token de equipo','POST /tasks: tarea + escritorio','GET /health; GET /tasks/{id}'])
box(285,382,235,95,'API Node / TypeScript',['Auth + validación + admisión','Aceptación <2 s; sin esperar al modelo','SQLite: estado/resumen; sin password'])
box(590,382,215,95,'Worker por tarea',['Lease por escritorio; 1 tarea inicial','Deadline monotónico; acciones acotadas','Roles planner / localizador / verificador'])
arrow(215,429,285,429,'HTTPS');arrow(520,429,590,429,'task_id')
box(590,213,215,108,'Cliente RFB propio',['Sin noVNC ni Chromium','Framebuffer nativo + eventos RFB','150 ms clic; repintado + estabilidad','Sin DOM ni APIs de app remota'])
arrow(697,382,697,321,'observar / actuar')
box(285,213,235,108,'Modelo visual vía OpenRouter',['Sonnet baseline; Gemini lectura','Frame_id / epoch + tarea + crop','JSON / target / resultado esperado','Policy valida; éxito con evidencia'])
arrow(590,267,520,267,'pixels'); arrow(520,239,590,239,'propuesta')
box(35,213,180,108,'Escritorio recibido',['Websocket /websockify + password','RFB / VNC; app desconocida','SIGECOM 1280x800 en prácticas','No se abre otra app por URL'])
arrow(590,202,215,202)
c.setFillColor(teal);c.setFont('Helvetica',8);c.drawCentredString(402,188,'VNC/RFB: conexión desde visor al escritorio')
c.setStrokeColor(colors.HexColor('#CBD9E2'));c.line(35,177,805,177)
box(35,62,365,89,'Guardas y finalización',['Identidad, alcance; ignorar injection; anti-loop','Cancelar 270 s; descartar tardías; cerrar 280 s','Publicar terminal después de detener todas las acciones'])
box(435,62,370,89,'Harness solo de desarrollo',['Reset -> E1-E5 -> __check + estado/resumen','Unicode, layout, modal, timeout y caída tras guardar','Mismo Docker en staging/final; memoria y p95 por medir'])
c.setFillColor(navy);c.setFont('Helvetica',8);c.drawString(35,35,'Exploración visual real confirmada. E1 real pasó; E2-E5, despliegue y generalización por medir.')
c.save()
