"""Create a same-laptop recovery package; not a universal Windows installer."""
from pathlib import Path
import hashlib
import json
import sqlite3
import zipfile

root=Path(__file__).resolve().parent.parent
out=root.parent/'outputs';out.mkdir(exist_ok=True)
destination=out/'AisleSense_Final_Round_Demo.zip'
folders=['src','backend','dist','models','licenses','evidence','presentation','tests','scripts','.venv']
files=[p for p in root.iterdir() if p.is_file() and p.suffix in ('.md','.py','.cmd','.json','.txt','.ts','.html')]
for folder in folders:
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='package-check.json')
for name in ['normal-shopping.mp4','sources.json']:
    files.append(root/'data'/'sources'/name)
files.extend(p for p in (root/'data'/'clips').glob('*.mp4'))
staging=root/'.tmp'/'events-backup.sqlite3';staging.parent.mkdir(exist_ok=True,parents=True)
with sqlite3.connect(root/'data'/'events.sqlite3') as source,sqlite3.connect(staging) as target:
    source.backup(target)
critical=['dist/index.html','models/pose_landmarker_lite.task','data/sources/normal-shopping.mp4','launch.py']
manifest={'purpose':'Same-laptop recovery archive; requires this laptop Python installation. No Node or internet needed to run prepared build.',
          'entrypoints':['Start Business Dashboard.cmd','Start 3D Simulation.cmd','Start Control Room.cmd'],
          'sha256':{name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in critical}}
with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED,compresslevel=1) as archive:
    for p in sorted(set(files)):
        archive.write(p,'aislesense/'+p.relative_to(root).as_posix())
    archive.write(staging,'aislesense/data/events.sqlite3')
    archive.writestr('aislesense/PACKAGE_MANIFEST.json',json.dumps(manifest,indent=2))
with zipfile.ZipFile(destination) as archive:
    corrupt=archive.testzip()
    if corrupt:raise RuntimeError('Archive CRC failure: '+corrupt)
    for name,expected in manifest['sha256'].items():
        assert hashlib.sha256(archive.read('aislesense/'+name)).hexdigest()==expected
result={'file':str(destination),'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),
        'crc_verified':True,'critical_assets_verified':True,'archive_entries':len(files)+2}
(out/'AisleSense_Final_Round_Demo.sha256.txt').write_text(result['sha256']+'  '+destination.name+'\n')
(root/'evidence'/'package-check.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
