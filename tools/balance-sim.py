"""バトルバランス検証シミュレーター

docs/SPEC.md 「3.4 ダメージ計算」のダメージばいりつを決めるために使用した。
ルール（出目 x ばいりつ、こうかばつぐんで2倍、たいりょく半分以下でメガシンカしてサイコロ2個）
のもとで、1バトルが何ターンで終わるかを試行して平均・95パーセンタイル・最大を出す。

ルールを変更したときは、このスクリプトを再実行してプレイ時間が
園児の集中力（目安10分以内）に収まるかを必ず確認すること。

    python3 tools/balance-sim.py
"""
import random, statistics
CHART={ 'ほのお':['くさ','こおり','むし','はがね'],'みず':['ほのお','じめん','いわ'],
'くさ':['みず','じめん','いわ'],'でんき':['みず','ひこう'],'こおり':['くさ','じめん','ひこう','ドラゴン'],
'かくとう':['ノーマル','こおり','いわ','あく','はがね'],'どく':['くさ','フェアリー'],
'じめん':['ほのお','でんき','どく','いわ','はがね'],'ひこう':['くさ','かくとう','むし'],
'エスパー':['かくとう','どく'],'むし':['くさ','エスパー','あく'],'いわ':['ほのお','こおり','ひこう','むし'],
'ゴースト':['エスパー','ゴースト'],'ドラゴン':['ドラゴン'],'あく':['エスパー','ゴースト'],
'はがね':['こおり','いわ','フェアリー'],'フェアリー':['かくとう','ドラゴン','あく'],'ノーマル':[]}
TYPES=list(CHART)
# ばつぐん発生率
hit=sum(1 for a in TYPES for b in TYPES if b in CHART[a])/(len(TYPES)**2)
print(f"ばつぐん発生率: {hit*100:.1f}%  (ランダムなタイプ同士の場合)\n")
def battle(mult,n,mega_rate=0.4):
    def mk(): 
        ps=[{'hp':random.randint(15,35)*10,'t':random.choice(TYPES),'mega':random.random()<mega_rate,'on':False} for _ in range(n)]
        for p in ps: p['max']=p['hp']
        return ps
    A,B=mk(),mk(); turns=0; side=0
    while any(p['hp']>0 for p in A) and any(p['hp']>0 for p in B):
        turns+=1
        me,opp=(A,B) if side==0 else (B,A)
        atk=next(p for p in me if p['hp']>0); tgt=next(p for p in opp if p['hp']>0)
        if atk['mega'] and not atk['on'] and atk['hp']<=atk['max']/2: atk['on']=True
        dice=random.randint(1,6)+(random.randint(1,6) if atk['on'] else 0)
        d=dice*mult
        if tgt['t'] in CHART[atk['t']]: d*=2
        tgt['hp']=max(0,tgt['hp']-d); side^=1
        if turns>2000: break
    return turns
for mult in (10,20,30):
    for n in (1,2,3):
        xs=[battle(mult,n) for _ in range(20000)]
        m=statistics.mean(xs); p95=sorted(xs)[int(len(xs)*.95)]
        print(f"x{mult:<3} {n}vs{n}: 平均{m:5.1f}ターン (95%tile {p95:3d}, 最大{max(xs):3d}) 約{m*20/60:4.1f}分")
    print()
