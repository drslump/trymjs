from flask import Flask, request


import socket
import tarfile
import io
import json
import sys
import os

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



# CrossDomain decorator

from datetime import timedelta
from flask import make_response, request, current_app
from functools import update_wrapper


def crossdomain(origin=None, methods=None, headers=None,
                max_age=21600, attach_to_all=True,
                automatic_options=True):
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods

        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp

            h = resp.headers

            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)
            if headers is not None:
                h['Access-Control-Allow-Headers'] = headers
            return resp

        f.provide_automatic_options = False
        return update_wrapper(wrapped_function, f)
    return decorator

# ------



def compile(sh, code):
    pwd = os.path.dirname(__file__)
    box = Sandbox('/var/run/sandboxd.socket')
    box.tar.add(pwd + '/timeout', arcname='timeout')
    box.tar.add(pwd + '/' + sh, arcname='init')

    # Wrap the code in a file-like object for tar
    import StringIO
    from tarfile import TarInfo
    strio = StringIO.StringIO(code)
    codeinfo = TarInfo('program.boo')
    codeinfo.size = len(strio.buf)
    box.tar.addfile(tarinfo=codeinfo, fileobj=strio)

    box.timeout = 5
    box.start()

    return '\n'.join(box.output)



app = Flask(__name__)
app.debug = True

@app.route('/')
def index():
    return "<span style='color:red'>I am app 1</span>"

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

