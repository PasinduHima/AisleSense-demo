"""Prepare a small local derivative of the licensed Pexels normal-shopping clip."""
from pathlib import Path
import hashlib
import json
import subprocess
import imageio_ffmpeg

root=Path(__file__).resolve().parent.parent
folder=root/'data'/'sources'
source=folder/'normal-shopping-original.mp4'
out=folder/'normal-shopping.mp4'
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-loglevel','error','-i',str(source),
                '-vf','scale=960:-2','-an','-c:v','libx264','-preset','fast','-crf','25','-threads','2',
                '-movflags','+faststart',str(out)],check=True,timeout=120)
manifest={'title':'Man Looking at a Product Inside a Supermarket','creator':'Kampus Production',
 'page':'https://www.pexels.com/video/man-looking-at-a-product-inside-a-supermarket-8420776/',
 'download':'https://videos.pexels.com/video-files/8420776/8420776-uhd_3840_2160_25fps.mp4',
 'licence':'Pexels License','licence_url':'https://www.pexels.com/license/',
 'retrieved':'2026-11-08','intended_use':'Ordinary shopping: pose, occupancy and neutral zone-entry tests. Not concealment or misconduct evidence.',
 'restrictions':'Do not portray identifiable people in a bad light, imply endorsement, or redistribute as a stock service.',
 'processing':'Downscaled to 960px, audio removed for local educational demonstration.',
 'file':out.name,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'split':'development; not a held-out accuracy evaluation'}
(folder/'sources.json').write_text(json.dumps([manifest],indent=2),encoding='utf-8')
print(json.dumps({'file':out.name,'bytes':out.stat().st_size,'sha256':manifest['sha256']}))
