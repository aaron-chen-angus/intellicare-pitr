from math import cos, sin, pi

def recorded_fixture(now_ms):
    base = now_ms - 100000
    strokes = []
    def add(points, subject, seconds, color='#15243a', size=9):
        t=base+int(seconds*1000)
        pts=[{'x':x,'y':y,'t':t+i*20,'pressure':.55} for i,(x,y) in enumerate(points)]
        xs=[p[0] for p in points];ys=[p[1] for p in points]
        strokes.append({'id':f's{len(strokes)+1}','subject':subject,'start':t,'end':pts[-1]['t'],'tool':'ink','color':color,'size':size,'opacity':90,'points':pts,'bbox':{'x':min(xs),'y':min(ys),'width':max(xs)-min(xs),'height':max(ys)-min(ys)},'averagePressure':.55})
    add([(610+75*cos(i*pi/16),470+75*sin(i*pi/16)) for i in range(33)],'person',5)
    add([(585,455),(589,455)],'person',6)
    add([(630,455),(634,455)],'person',7)
    add([(583,487),(600,499),(620,499),(637,487)],'person',8)
    add([(610,546),(610,980)],'person',10,color='#f6d58a',size=28)
    add([(610,675),(425,805)],'person',12)
    add([(610,675),(800,650),(850,540)],'person',14)
    add([(610,980),(440,1240)],'person',16)
    add([(610,980),(780,1240)],'person',18)
    add([(335,330),(440,230),(570,180),(690,180),(825,230),(940,330),(335,330)],'umbrella',28,color='#b4a1d4')
    add([(850,330),(850,760),(830,790),(810,760)],'umbrella',30,color='#53718a')
    for i in range(8):add([(150+i*130,100),(170+i*130,190)],'rain',45+i*.4,color='#53718a')
    add([(200,1370),(430,1400),(670,1360),(1020,1390)],'scene',80,color='#6fb7a6')
    add([(425,1295),(600,1280),(800,1290),(880,1320),(620,1340),(425,1295)],'scene',85,color='#ffffff')
    add([(90,1440),(120,1480)],'unlabelled',92)
    return {'profile':{'name':'QA artist','ageGroup':'adult','consent':True},'startTime':base,'drawingDataUrl':'','strokes':strokes,'fillOps':[],'undoCount':2}
