from flask import Flask, request

import socket
import io
import json
import sys
import os
import tarfile
import StringIO

from utils import crossdomain


SANDBOXD_SOCKET = '/var/run/sandboxd.socket'
SANDBOXD_TIMEOUT = 5

class Sandbox(object):
    def __init__(self, path):
        self.path = path
        self._tarout = io.BytesIO()
        self.tar = tarfile.open(fileobj=self._tarout, mode='w')
        self.timeout = None

    def start(self):
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.connect(self.path)
        self.output = self.sock.makefile('r+', bufsize=0)
        options = {'timeout': self.timeout}
        self.output.write(json.dumps(options) + '\n')
        self.tar.close()
        self.output.write(self._tarout.getvalue())
        self.sock.shutdown(socket.SHUT_WR)


def compile(sh, code):
    box = Sandbox(SANDBOXD_SOCKET)
    pwd = os.path.dirname(__file__)
    box.tar.add(pwd + '/' + sh, arcname='init')

    # Wrap the code in a file-like object for tar
    strio = StringIO.StringIO(code)
    codeinfo = tarfile.TarInfo('program.boo')
    codeinfo.size = len(strio.buf)
    box.tar.addfile(tarinfo=codeinfo, fileobj=strio)

    box.timeout = SANDBOXD_TIMEOUT
    box.start()

    return '\n'.join(box.output)


app = Flask(__name__)
app.debug = True


@app.route('/compile/boo', methods=['POST'])
@crossdomain(origin='*') # Only for development
def compile_boo():
    # We must consume the posted data before we can return a response
    code = request.data
    if len(code) > 1024 * 10:
        raise Exception('Code size exceeds the configured limit')

    return compile('boo.sh', code)


@app.route('/compile/boojs', methods=['POST'])
@crossdomain(origin='*') # Only for development
def compile_boojs():
    # We must consume the posted data before we can return a response
    code = request.data
    if len(code) > 1024 * 10:
        raise Exception('Code size exceeds the configured limit')

    return compile('boojs.sh', code)

