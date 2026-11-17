"""Generate Turkish print references from the validated canonical data."""
import json
import sys
from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, A5, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

data = json.loads(Path(sys.argv[1]).read_text())
output = Path('public/print')
base = data['publicBaseUrl']
records = {record['id']: record for record in data['records']}
pdfmetrics.registerFont(TTFont('Noto', 'assets/fonts/NotoSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoBold', 'assets/fonts/NotoSans-Bold.ttf'))
pdfmetrics.registerFontFamily('Noto', normal='Noto', bold='NotoBold')
ink = colors.HexColor('#26362f')
green = colors.HexColor('#345247')
muted = colors.HexColor('#586659')
line = colors.HexColor('#d9dfd3')
soft = colors.HexColor('#f1f4eb')

def paragraph(text, size=10, color=ink, bold=False, leading=None):
    style = ParagraphStyle('body', fontName='NotoBold' if bold else 'Noto', fontSize=size,
        leading=leading or size*1.4, textColor=color, spaceAfter=0)
    return Paragraph(text, style)

def text(c, text, x, top, width, size=10, bold=False, color=ink):
    p = paragraph(text, size, color, bold)
    _, height = p.wrap(width, 1000)
    p.drawOn(c,x,top-height)
    return top-height

def header(c, title, size, subtitle):
    width,height=size
    c.setFillColor(ink)
    c.setFont('NotoBold',18)
    c.drawString(25,height-39,title)
    text(c,subtitle,25,height-49,width-50,8.5,color=muted)
    c.setStrokeColor(line)
    c.line(25,height-77,width-25,height-77)
    return height-96

def footer(c,size,number):
    width,_=size
    c.setStrokeColor(line)
    c.line(25,33,width-25,33)
    c.setFillColor(muted)
    c.setFont('Noto',7.3)
    c.drawString(25,19,'MS23K3555ES/ND · Samsung TR kılavuz 09 · 17.11.2026')
    c.drawRightString(width-25,19,str(number))

def panel(c,x,y,width=150):
    scale=width/250
    c.saveState()
    c.translate(x,y)
    c.scale(scale,scale)
    c.setFillColor(soft)
    c.setStrokeColor(muted)
    c.roundRect(0,0,250,450,13,fill=1)
    c.setFillColor(ink)
    c.roundRect(50,377,150,49,4,fill=1,stroke=0)
    c.setFillColor(colors.white)
    c.setFont('Noto',25)
    c.drawCentredString(125,392,'12:00')
    for index,control in enumerate(data['controls'][:8]):
        bx=24+(index%2)*104
        by=312-(index//2)*51
        c.setFillColor(colors.white)
        c.roundRect(bx,by,96,40,4,fill=1)
        c.setFillColor(ink)
        c.setFont('Noto',9.5)
        c.drawCentredString(bx+48,by+16,control['hardware'])
    c.setFillColor(colors.white)
    c.circle(108,98,39,fill=1)
    c.setFillColor(ink)
    c.setFont('Noto',12)
    c.drawCentredString(108,94,'-   +')
    c.setFillColor(colors.white)
    c.roundRect(163,57,69,40,4,fill=1)
    c.setFillColor(ink)
    c.setFont('Noto',8)
    c.drawCentredString(197.5,74,'Seç/Saat')
    for bx,label in [(24,'STOP/ECO'),(128,'START/+30s')]:
        c.setFillColor(colors.white)
        c.roundRect(bx,8,96,40,4,fill=1)
        c.setFillColor(ink)
        c.setFont('Noto',9.5)
        c.drawCentredString(bx+48,24,label)
    c.restoreState()

def qr(c,id,x,y,size=75):
    c.drawImage(str(output/f'qr-{id}.png'),x,y,size,size,mask='auto')

def sequence(c,title,lines,x,y,width):
    y=text(c,title,x,y,width,11,True)-9
    for index,line_text in enumerate(lines,1):
        y=text(c,f'<b>{index}.</b> {escape(line_text)}',x,y,width,9.5)-5
    return y-11

# Two A5 landscape sides.
size=landscape(A5)
width,height=size
c=canvas.Canvas(str(output/'everyday-card.pdf'),pagesize=size)
c.setTitle('MS23K3555ES/ND · Günlük kullanım kartı')
y=header(c,'Günlük kullanım',size,'Güç ve süreyi seç. Seç/Saat ile onayla. START/+30s ile başlat.')
panel(c,25,57,145)
text(c,'Döndürme ve onay ayrı işlemlerdir.<br/>Seç/Saat, çevirme düğmesinin sağındadır.',25,53,145,7.3,color=muted)
x=195
col=width-x-25
y=sequence(c,'Hızlı başlat · 800 W',[
    'Yiyeceği yerleştir. Kapağı kapat.',
    'START/+30s düğmesine bas. Her ek basış 30 saniye ekler.'
],x,y,col)
manual_steps=records['manual-heating']['sequenceLabels']
y=sequence(c,'Elle ısıtma / pişirme',[
    manual_steps[0], ' '.join(manual_steps[1:3]), ' '.join(manual_steps[3:5])
],x,y,col)
y=text(c,'Güç seviyeleri',x,y,col,11,True)-10
y=text(c,' · '.join(str(power) for power in data['powerLevels'])+' W',x,y,col,10)-15
y=text(c,'STOP/ECO',x,y,col,10,True)-5
y=text(c,'Pişirirken bir kez bas: duraklat. Tekrar bas: iptal et. Devam için kapağı kapatıp START/+30s kullan. Beklemedeyken STOP/ECO ekranı kapatır.',x,y,col,9)-10
y=text(c,'Fırını boş çalıştırma. Mikrodalgaya uygun kap kullan. Sıcak kap ve buhar için eldiven kullan.',x,y,col,8.5,color=muted)
if y<40:raise ValueError('Everyday front content exceeds safe margin')
footer(c,size,1)
c.showPage()
y=header(c,'Programı seç, adımları izle',size,'Aynı numara farklı işlevlerde farklı yiyecek seçer. Tam kodu ve işlevi birlikte kontrol et.')
left_width=width-155
y=sequence(c,'Healthy Steam · 17 program · s. 15-16',[
    'Healthy Steam > grup 1 veya 2 > Seç/Saat.',
    'Yiyecek kodu > Seç/Saat > listelenen miktar > START/+30s.'
],25,y,left_width-25)
y=sequence(c,'Auto Cook · 20 program · s. 18-20',[
    'Tablodaki sabit miktarı hazırla.',
    'Auto Cook > kod > Seç/Saat > START/+30s.'
],25,y,left_width-25)
y=sequence(c,'Quick Defrost · 5 program · s. 20-21',[
    'Ambalajı çıkar. Uygun tabağa yerleştir.',
    'Quick Defrost > kod > Seç/Saat > ağırlık > START/+30s.',
    'Sinyalde kapağı aç, çevir, kapat ve START/+30s ile devam et. Tablodaki süre kadar beklet.'
],25,y,left_width-25)
y=text(c,'Çocuk kilidi: Child Lock düğmesini 3 saniye tut. Açmak için tekrarla. Koku giderme: önce temizle, Deodorization düğmesine bas. Hemen başlar (5 dk.).',25,y,left_width-25,8.5)
if y<40:raise ValueError('Everyday reverse content exceeds safe margin')
qr(c,'home',width-118,height-187,87)
text(c,'Tam rehber',width-125,height-195,100,11,True)
text(c,escape(base.replace('https://','')),width-140,height-217,125,8)
text(c,'QR hedefi dağıtımdan sonra açılacaktır.',width-130,height-252,105,8,color=muted)
text(c,'Ayrı standa koy.<br/>Havalandırmayı, kapağı ve düğmeleri açık bırak.',width-130,110,105,8,color=muted)
footer(c,size,2)
c.save()

# Full index, with one function per section and complete source-backed notes.
index_size=landscape(A4)
index_width,index_height=index_size
doc=SimpleDocTemplate(str(output/'preset-index.pdf'),pagesize=index_size,rightMargin=28,leftMargin=28,topMargin=30,bottomMargin=43,title='MS23K3555ES/ND · Tam program dizini')
story=[]
names={'healthy-steam':'Healthy Steam · Sağlıklı Buhar','auto-cook':'Auto Cook · Otomatik Pişirme','quick-defrost':'Quick Defrost · Hızlı Buz Çözme'}
for function_index,(function,name) in enumerate(names.items()):
    if function_index:story.append(PageBreak())
    title=paragraph(name,20,bold=True)
    desc=paragraph('MS23K3555ES/ND · Türkçe kılavuz 09 · '+('Önce grup, sonra yiyecek kodu seçilir.' if function=='healthy-steam' else 'Miktar bu kod için sabittir, ayrı ağırlık seçilmez.' if function=='auto-cook' else '200-1500 g. Ağırlık artış adımı kılavuzda belirtilmemiştir.'),9,color=muted)
    from reportlab.platypus import Image
    qr_image=Image(str(output/f'qr-{function}.png'),width=76,height=76)
    title_table=Table([[ [title,Spacer(1,8),desc],qr_image]],colWidths=[index_width-150,94])
    title_table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0)]))
    story += [title_table,paragraph(escape(base+'/functions/'+function),8,color=muted),Spacer(1,15)]
    headings=[paragraph(value,9,bold=True) for value in ['Kod / grup','Yiyecek ve miktar','Hazırlık ve bekleme','PWA / kaynak']]
    rows=[headings]
    for record in data['records']:
        if not record['automatic'] or record['function']!=function:continue
        code=record['code']
        code_text=escape(code)
        if record['groupCode']:
            code_text+=f'<br/><font size="8">Grup {record["groupCode"]}<br/>Yiyecek {record["foodCode"]}</font>'
        food=f'<b>{escape(record["title"]["tr"])}</b><br/>{escape(record["quantityLabel"])}'
        notes=' '.join(item['tr'] for item in record['preparation'])
        if record['standing']:
            stand=record['standing']
            stand_text=str(stand['min']) if stand['min']==stand['max'] else f'{stand["min"]}-{stand["max"]}'
            notes+=f' Pişirme sonrası {stand_text} dk. bekletin.'
        if record['function']=='quick-defrost':notes+=' Sinyalde kapağı açın, çevirin/karıştırın, kapatıp START/+30s ile devam edin.'
        notes+=' '+' '.join(item['tr'] for item in record['warnings'])
        url=base+'/programs/'+record['id']
        pages=sorted(set(page for source in record['sources'] for page in source['pages']))
        link=f'<link href="{escape(url)}" color="#345247"><b>Adımları aç</b></link><br/>{escape(record["id"])}<br/>TR09 s. '+', '.join(str(page) for page in pages)
        rows.append([paragraph(code_text,11,bold=True),paragraph(food,10),paragraph(escape(notes),9,leading=13),paragraph(link,8,leading=12)])
    table=Table(rows,colWidths=[62,154,index_width-56-62-154-98,98],repeatRows=1,hAlign='LEFT')
    table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),soft),('LINEBELOW',(0,0),(-1,0),1,green),('LINEBELOW',(0,1),(-1,-1),.4,line),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
    story.append(table)
    story.append(Spacer(1,15))
    story.append(paragraph('Tam düğme sırası için PWA bağlantısını açın. Otomatik süre ve gücü fırın belirler. Genel güvenlik uyarıları için resmi kılavuzu okuyun.',9,color=muted))
doc.build(story,onFirstPage=lambda c,d:footer(c,index_size,d.page),onLaterPages=lambda c,d:footer(c,index_size,d.page))

# A5 landscape panel legend.
c=canvas.Canvas(str(output/'button-legend.pdf'),pagesize=size)
c.setTitle('MS23K3555ES/ND · Düğme rehberi')
y=header(c,'Düğmeler ve işlevler',size,'Fiziksel düzen · Samsung Türkiye kılavuzu 09, s. 11')
panel(c,25,50,145)
legend=[(control['name']['tr'] if control['id'] in ['dial','select-clock'] else control['hardware'],control['shortPurpose']['tr']) for control in data['controls']]
for label,description in legend:
    y=text(c,f'<b>{escape(label)}</b> · {escape(description)}',195,y,width-220,9.3)-3
qr(c,'controls',width-101,46,67)
text(c,escape(base.replace('https://','')+'/controls'),195,76,width-310,8,color=muted)
text(c,'Ayrı standa koy. Hava deliklerini, kapağı ve kontrolleri kapatma.',195,52,width-310,7.5,color=muted)
if y<115:raise ValueError('Button legend content exceeds QR region')
footer(c,size,1)
c.save()
print('PDFs generated from',len([r for r in data['records'] if r['automatic']]),'presets')
