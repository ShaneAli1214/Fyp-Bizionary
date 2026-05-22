import urllib.request,json
url='http://127.0.0.1:8000/api/products/'
resp=urllib.request.urlopen(url, timeout=5)
prods=json.load(resp)
if isinstance(prods, dict) and 'results' in prods:
    prods=prods['results']
cats=sorted(set([p.get('category') or '' for p in prods]))
print('Unique categories (count={})'.format(len(cats)))
for c in cats:
    print('-', c)
