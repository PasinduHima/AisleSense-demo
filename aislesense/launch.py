"""Local-only launcher. Uses the installed environment and cached assets, no download."""
from pathlib import Path
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT=Path(__file__).resolve().parent
URL='http://127.0.0.1:8765'


def health():
    try:
        with urllib.request.urlopen(URL+'/api/health',timeout=1) as response:
            data=json.load(response)
            return data.get('app')=='AisleSense' and data.get('status')=='ok'
    except (OSError,ValueError,urllib.error.URLError):
        return False


def main():
    open_url=URL+('?view=system' if '--system' in sys.argv else '')
    if '--check' in sys.argv:
        print('AisleSense is ready.' if health() else 'AisleSense is not running.')
        return 0 if health() else 1
    if health():
        print('AisleSense is already running. Opening the dashboard.')
        if '--no-browser' not in sys.argv:webbrowser.open(open_url)
        return 0
    missing=[str(p.relative_to(ROOT)) for p in (
        ROOT/'dist'/'index.html',ROOT/'models'/'pose_landmarker_lite.task',
        ROOT/'data'/'sources'/'normal-shopping.mp4') if not p.exists()]
    if missing:
        print('Setup is incomplete. Missing: '+', '.join(missing))
        print('See README.md before the presentation.')
        return 1
    logs=ROOT/'logs';logs.mkdir(exist_ok=True)
    print('Starting AisleSense — Team Everguard',flush=True)
    print('Keep this window open. Press Ctrl+C here to stop the local system.',flush=True)
    flags=(subprocess.CREATE_NO_WINDOW|subprocess.CREATE_NEW_PROCESS_GROUP) if os.name=='nt' else 0
    with (logs/'server.log').open('a',encoding='utf-8') as log:
        proc=subprocess.Popen([sys.executable,'-u','-m','uvicorn','backend.app:app',
                               '--host','127.0.0.1','--port','8765','--no-access-log'],
                              cwd=ROOT,stdout=log,stderr=log,creationflags=flags)
        try:
            for _ in range(90):
                if proc.poll() is not None:
                    print('The local service could not start. Check logs/server.log; port 8765 may be occupied.')
                    return 1
                if health():break
                time.sleep(.5)
            else:
                print('Startup timed out. Check logs/server.log.')
                return 1
            print('Ready: '+URL,flush=True)
            print('The prepared demo works without internet on this laptop.',flush=True)
            if '--no-browser' not in sys.argv:webbrowser.open(open_url)
            return proc.wait()
        except KeyboardInterrupt:
            print('\nStopping AisleSense. Saved reviews are retained.',flush=True)
            return 0
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:proc.wait(timeout=8)
                except subprocess.TimeoutExpired:proc.kill();proc.wait()


if __name__=='__main__':raise SystemExit(main())
