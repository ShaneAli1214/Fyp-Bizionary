import urllib.request, json
url='http://127.0.0.1:8000/api/products/'
resp=urllib.request.urlopen(url, timeout=5)
prods=json.load(resp)
if isinstance(prods, dict) and 'results' in prods:
    prods=prods['results']

def normalize(raw):
    s = str(raw or '').strip().lower()
    if any(k in s for k in ['electr','appliance','mobile','tv','laptop']):
        return 'Tech'
    if any(k in s for k in ['grocery','food','rice','atta','oil']):
        return 'Grocery'
    if any(k in s for k in ['construct','cement','pipe','hardware']):
        return 'Construction'
    if any(k in s for k in ['cloth','textile','garment','suit','jean']):
        return 'Clothing'
    if any(k in s for k in ['autom','tyre','battery','car']):
        return 'Automobile'
    if s in ['stationary','stationery'] or 'office' in s:
        return 'Stationary'
    if any(k in s for k in ['pharma','medic','health']):
        return 'Medicines'
    return 'Unmapped'

counts={}
for p in prods:
    cat=normalize(p.get('category',''))
    counts[cat]=counts.get(cat,0)+1
print(counts)
