"""Import the publisher's public-domain ASV VPL archive without rewriting Scripture.
Usage: python script/import-asv.py /path/to/eng-asv_vpl.zip
Publisher: https://ebible.org/Scriptures/eng-asv_vpl.zip
"""
import gzip,hashlib,json,pathlib,re,sys,zipfile
root=pathlib.Path(__file__).resolve().parent.parent
with zipfile.ZipFile(sys.argv[1]) as archive:
    raw=archive.read('eng-asv_vpl.txt')
    assert hashlib.sha256(raw).hexdigest()=='8924ef74086d572425b1e335f531c7c529a561969e5c851e456b84c2ce6ad858','Publisher text changed: review the new source before importing.'
    text=raw.decode('utf-8-sig')
    books=re.findall(r'\{ id: "([^"]+)", name: "([^"]+)", chapters: (\d+)',(root/'client/src/lib/bible-data.ts').read_text())
    assert len(books)==66
    codes=list(dict.fromkeys(line.split()[0] for line in text.splitlines() if line.strip()))
    assert len(codes)==66
    data={};seen=set()
    for line in text.splitlines():
        match=re.fullmatch(r'(\S+) (\d+):(\d+) (.*)',line)
        assert match,line
        code,chapter,verse,body=match.groups();number=codes.index(code)+1
        identity=(number,int(chapter),int(verse));assert identity not in seen;seen.add(identity)
        key=f'{number}:{chapter}'
        entry=data.setdefault(key,{'book':books[number-1][1],'chapter':int(chapter),'verses':[],'actualTranslation':'ASV','isFallback':False})
        entry['verses'].append({'verse':int(verse),'text':body})
    assert len(seen)==31102 and len(data)==1189
    for i,(_,_,count) in enumerate(books,1):
        assert all(f'{i}:{c}' in data for c in range(1,int(count)+1))
    encoded=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()
    target=root/'server/scripture-data/asv1901.json.gz';target.write_bytes(gzip.compress(encoded,mtime=0))
    (root/'server/scripture-data/ASV-SOURCE.md').write_text('''# American Standard Version 1901\n\nPublisher: eBible.org, public-domain text, edition dated 2026-10-30.\n\nSource: https://ebible.org/Scriptures/eng-asv_vpl.zip\nPublisher permissions: https://www.ebible.org/find/details.php?id=eng-asv\n\nOriginal VPL SHA-256: `8924ef74086d572425b1e335f531c7c529a561969e5c851e456b84c2ce6ad858`.\n\n31,102 verses, 1,189 chapters, 66 books. Every verse body is retained verbatim from the publisher, including brackets marking supplied words. The importer changes only the reference representation into chapter JSON, and checks all canonical chapter counts, unique references and the pinned publisher text hash. It rejects a changed source pending review.\n\nGenerated with `python script/import-asv.py /path/to/eng-asv_vpl.zip`. No build-time external download is required. The server loads the compressed public-domain data and delivers individual chapters; clients do not download the complete Bible.\n''')
    print('Imported',len(seen),'unaltered verses in',len(data),'chapters; compressed bytes',target.stat().st_size)
