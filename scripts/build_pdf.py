from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE = Path(__file__).resolve().parent.parent
(BASE/'tmp/pdfs').mkdir(parents=True,exist_ok=True)
DATA = json.loads((BASE/'estimate-content.json').read_text())
OUT = BASE/'dist/smeta.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('DV', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DV-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('DV', normal='DV', bold='DV-Bold')
W,H = A4
M = 40
CW = W-2*M
INK = colors.HexColor('#18343F')
TEAL = colors.HexColor('#0B7776')
MUTED = colors.HexColor('#526771')
PALE = colors.HexColor('#EAF5F3')
LIGHT = colors.HexColor('#F3F6F7')
LINE = colors.HexColor('#D9E3E6')
WHITE = colors.white
PAGES = 6
c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
c.setTitle('Смета сайта пассажирских перевозок - черновик v0.2')
c.setAuthor('Николай')
c.setSubject('Единый пакет разработки, 100% предоплата, ежегодные расходы и дополнительные услуги')
positions=[]
overflows=[]

def clean(s):
    return str(s).replace('\u2011','-').replace('\u2013','-').replace('\u2014','-')

def money(n):
    return f'{n:,}'.replace(',',' ')+' ₽'

def para(t,size=12.1,leading=None,color=INK,bold=False,align=TA_LEFT):
    return Paragraph(clean(t),ParagraphStyle('p',fontName='DV-Bold' if bold else 'DV',fontSize=size,
      leading=leading or size*1.39,textColor=color,alignment=align,spaceBefore=0,spaceAfter=0,
      allowWidows=0,allowOrphans=0))

def measure(t,w=CW,size=12.1,leading=None,bold=False):
    return para(t,size,leading,bold=bold).wrap(w,2500)[1]

def p(t,y,x=M,w=CW,size=12.1,leading=None,color=INK,bold=False,align=TA_LEFT):
    pp=para(t,size,leading,color,bold,align)
    _,hh=pp.wrap(w,2500)
    pp.drawOn(c,x,H-y-hh)
    positions.append({'page':c.getPageNumber(),'top':round(y,2),'bottom':round(y+hh,2),'text':clean(t)[:100]})
    return y+hh

def box(x,y,w,h,fill=LIGHT,radius=10):
    c.setFillColor(fill)
    c.roundRect(x,H-y-h,w,h,radius,fill=1,stroke=0)

def line(y,x=M,w=CW):
    c.setStrokeColor(LINE);c.setLineWidth(.6);c.line(x,H-y,x+w,H-y)

def header(section):
    box(M,25,5,18,TEAL,2)
    p('СМЕТА · '+section,26,x=M+15,w=CW-175,size=9.3,bold=True,color=MUTED)
    p('Черновик · '+DATA['date'],26,x=W-M-160,w=160,size=9.2,color=MUTED,align=TA_RIGHT)

def footer(n):
    line(H-40)
    p('Стоимость в рублях · версия '+DATA['version'],H-29,size=8.8,color=MUTED,w=CW-60)
    p(f'{n} / {PAGES}',H-29,x=W-M-45,w=45,size=8.8,color=MUTED,align=TA_RIGHT)

def end(y,n):
    if y>H-56: overflows.append({'page':n,'bottom':round(y,1),'limit':round(H-56,1)})
    footer(n);c.showPage()

def title(t,y=67):
    return p(t,y,size=25,leading=30,bold=True)+14

def section(t,y):
    return p(t,y,size=15.3,leading=20,bold=True)+12

def note(t,y,size=11.5,fill=PALE):
    h=measure(t,CW-30,size)+24
    box(M,y,CW,h,fill)
    p(t,y+12,x=M+15,w=CW-30,size=size,color=TEAL if fill==PALE else INK)
    return y+h

def content_card(label,text,y,num=None,size=11.9):
    xx=M+16 if num is None else M+52
    ww=W-M-16-xx
    ht=measure(label,ww,13.1,bold=True)
    hb=measure(text,ww,size)
    h=16+ht+6+hb+16
    box(M,y,CW,h)
    if num is not None:
        box(M+14,y+16,25,25,PALE,8)
        p(str(num).zfill(2),y+21,x=M+17,w=19,size=9.2,bold=True,color=TEAL)
    yy=p(label,y+16,x=xx,w=ww,size=13.1,bold=True)+6
    p(text,yy,x=xx,w=ww,size=size)
    return y+h

def price_panel(label,value,sub,y,dark=False,h=91):
    bg=INK if dark else PALE
    col=WHITE if dark else TEAL
    box(M,y,CW,h,bg)
    p(label,y+13,x=M+17,w=CW-34,size=10.6,color=col,bold=True)
    p(value,y+33,x=M+17,w=CW-34,size=29,leading=35,color=col,bold=True)
    if sub:
        p(sub,y+71,x=M+17,w=CW-34,size=10.4,leading=14,color=col)
    return y+h

def service_card(item,y):
    w=CW-32
    tw=w-218
    ht=max(measure(item['title'],tw,13.4,bold=True),measure(item['price'],208,18.4,bold=True))
    hb=measure(item['text'],w,11.8)
    hu=measure(item['unit'],w,10.7)
    h=14+ht+7+hu+9+hb+15
    box(M,y,CW,h)
    p(item['title'],y+14,x=M+16,w=tw,size=13.4,bold=True)
    p(item['price'],y+14,x=W-M-224,w=208,size=18.4,bold=True,color=TEAL,align=TA_RIGHT)
    z=y+14+ht+7
    z=p(item['unit'],z,x=M+16,w=w,size=10.7,color=MUTED)+9
    p(item['text'],z,x=M+16,w=w,size=11.8)
    return y+h

# 1. One complete development package.
header('ПРОЕКТ')
y=title('Сайт пассажирских перевозок')
y=p(DATA['subtitle'],y,size=12.2,color=MUTED)+17
y=price_panel('Разработка сайта · единый пакет',money(DATA['prices']['development']),
              '100% стоимости до начала работ',y,dark=True,h=92)+15
y=p('Все работы ниже входят в единый пакет разработки.',y,size=12.0)+13
for i,item in enumerate(DATA['package']['items'],1):
    y=content_card(item['title'],item['text'],y,num=i,size=11.7)+10
y=p('<b>Согласованный объём.</b> '+DATA['package']['scope'],y,size=11.7)
end(y,1)

# 2. Who receives payments and when; totals stay separate from optional work.
header('ОПЛАТА')
y=title('Когда и за что платить')
y=p('<b>100% предоплата</b> за работу исполнителя. Домен, хостинг и другие внешние сервисы оплачиваются заказчиком <b>напрямую либо с моей помощью.</b>',y,size=12.0)+14
y=price_panel('Запуск и первый год',money(DATA['prices']['firstYearTotal']),
              'Разработка + адрес сайта + размещение на 12 месяцев',y,h=96)+14
for item in DATA['payments']['initial']:
    h=14+measure(item['title'],CW-135,12.3,bold=True)+5+measure(item['when']+' · '+item['to'],CW-30,10.7)+6+measure(item['text'],CW-30,11.5)+14
    box(M,y,CW,h,LIGHT)
    z=p(item['title'],y+13,x=M+15,w=CW-145,size=12.3,bold=True)
    p(money(item['amount']),y+11,x=W-M-129,w=114,size=17,leading=23,color=TEAL,bold=True,align=TA_RIGHT)
    z=p(item['when']+' · '+item['to'],z+5,x=M+15,w=CW-30,size=10.7,color=MUTED)+6
    p(item['text'],z,x=M+15,w=CW-30,size=11.5)
    y+=h+9
y=p(DATA['payments']['ownership'],y,size=11.5)+19
y=note('<b>Если запускаем сайт вместе с рекламой: от 65 239 ₽.</b><br/>'+DATA['ads']['siteTotalNote'],y,size=11.8)+15
y=p('Ежегодные продления и дальнейшее ведение рекламы оплачиваются отдельно.',y,size=11.1,color=MUTED)
end(y,2)

# 3. Support and work rules in readable paragraphs.
header('ОБСЛУЖИВАНИЕ')
y=title('Ежегодные платежи')
y=p('<b>Первые 12 месяцев поддержки</b> с даты запуска включены в разработку. Со второго года действуют платежи ниже.',y,size=12.0)+15
for item in DATA['payments']['yearly']:
    h=14+measure(item['title'],CW-160,12.3,bold=True)+6+measure(item['text'],CW-30,11.5)+14
    box(M,y,CW,h,LIGHT)
    z=p(item['title'],y+14,x=M+15,w=CW-160,size=12.3,bold=True)
    p(money(item['amount'])+' / год',y+11,x=W-M-153,w=138,size=14.8,bold=True,color=TEAL,align=TA_RIGHT)
    p(item['text'],z+6,x=M+15,w=CW-30,size=11.5)
    y+=h+9
half=(CW-12)/2
for xx,label,value in [(M,'С продлением поддержки',money(DATA['prices']['renewalWithSupport'])),(M+half+12,'Без продления поддержки',money(DATA['prices']['renewalWithoutSupport']))]:
    box(xx,y,half,65,PALE)
    p(label,y+11,x=xx+13,w=half-26,size=10.4,color=MUTED)
    p(value+' / год',y+31,x=xx+13,w=half-26,size=17,leading=23,bold=True,color=TEAL)
y+=84
y=section('Что входит в поддержку',y)
for text in DATA['support']['items']:
    box(M,y+5,5,5,TEAL,2)
    y=p(text,y,x=M+16,w=CW-16,size=12.0)+10
y=p(DATA['support']['scope'],y,size=11.6,color=MUTED)+12
y=p(DATA['support']['changes'],y,size=11.8)
end(y,3)

# 4. Advertisement services and ad balance have separate purposes.
header('РЕКЛАМА')
y=title('Реклама в поиске Яндекса')
y=p(DATA['ads']['intro'],y,size=12.0)+15
for item in DATA['ads']['items']:
    y=service_card(item,y)+12
y=note('<b>Для старта рекламы: от 25 000 ₽</b><br/>'+DATA['ads']['startTotalNote'],y,size=11.8)+12
y=p(DATA['ads']['minimumNote'],y,size=10.6,color=MUTED)
end(y,4)

# 5. Small extras and source-backed external charges.
header('ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ')
y=title('Задачи вне пакета')
y=p(DATA['extras']['intro'],y,size=11.8)+13
for item in DATA['extras']['items']:
    # Compact service cards preserve the same comfortable body size.
    w=CW-30
    ht=measure(item['title'],w,13.0,bold=True)
    hp=measure('<b>'+item['price']+'</b> · '+item['unit'],w,12.0)
    hb=measure(item['text'],w,11.6)
    h=13+ht+5+hp+7+hb+13
    box(M,y,CW,h,LIGHT)
    z=p(item['title'],y+13,x=M+15,w=w,size=13,bold=True)+5
    z=p('<b>'+item['price']+'</b> · '+item['unit'],z,x=M+15,w=w,size=12,color=TEAL)+7
    p(item['text'],z,x=M+15,w=w,size=11.6)
    y+=h+10
y=p(DATA['extras']['priceNote'],y,size=10.8,color=MUTED)+10
end(y,5)

# 6. Plain-language conditions and current external tariff references.
header('ПОРЯДОК РАБОТЫ')
y=title('Что согласуем до начала')
for item in DATA['rules']:
    y=p(item['title'],y,size=13.8,bold=True)+7
    y=p(item['text'],y,size=12.0)+18
y=p('<b>Материалы для наполнения.</b> '+DATA['package']['materials'],y,size=11.8)+14
y=p('<b>Обработка заявок.</b> '+DATA['package']['operation'],y,size=11.8)+16
y=p(DATA['payments']['tariffNote'],y,size=10.8,color=MUTED)+15
y=p('<b>Источники внешних тарифов · проверено '+DATA['date']+'</b>',y,size=10.1,color=MUTED)+6
for item in DATA['sources']:
    label=item['url'].replace('https://','')
    y=p(item['label']+': <link href="'+escape(item['url'])+'" color="#0B7776">'+label+'</link>',y,size=9.8,leading=13.7,color=MUTED)+4
end(y,6)

c.save()
(BASE/'tmp/pdfs/layout_positions_v2.json').write_text(json.dumps(positions,ensure_ascii=False,indent=2))
print(json.dumps({'file':str(OUT),'bytes':OUT.stat().st_size,'pages':PAGES,'overflows':overflows,'content_bottoms':{str(i):max(q['bottom'] for q in positions if q['page']==i and q['top']<H-40) for i in range(1,PAGES+1)}},ensure_ascii=False))
assert not overflows, 'Layout needs more space'
