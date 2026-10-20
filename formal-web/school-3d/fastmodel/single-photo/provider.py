"""Official Meshy API transport. Keys stay in request headers on the server."""
import json
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler


class RequestRejected(RuntimeError):
    pass


class MeshyClient:
    def __init__(self, key, base_url='https://api.meshy.ai/openapi/v1'):
        self.key=key.strip();self.base=base_url.rstrip('/')
        parsed=urlparse(self.base)
        if self.base!='https://api.meshy.ai/openapi/v1' and not (parsed.scheme=='http' and parsed.hostname in ('127.0.0.1','localhost')):
            raise ValueError('API_ORIGIN_UNSUPPORTED')
    @property
    def configured(self):return bool(self.key)
    def request(self, path, payload=None):
        if not self.configured:raise ValueError('MESHY_API_KEY_NOT_CONFIGURED')
        req=Request(self.base+path,data=None if payload is None else json.dumps(payload).encode(),headers={'Authorization':'Bearer '+self.key,'Content-Type':'application/json','User-Agent':'AIG-FastModel/2.7'},method='GET' if payload is None else 'POST')
        # No automatic retry of a billable POST, including network timeouts.
        class NoRedirect(HTTPRedirectHandler):
            def redirect_request(self,*args,**kwargs):return None
        try:
            with build_opener(NoRedirect()).open(req,timeout=25) as response:
                raw=response.read(4*1024*1024+1)
                if len(raw)>4*1024*1024:raise ValueError('API_RESPONSE_TOO_LARGE')
                return json.loads(raw)
        except HTTPError as error:
            # Do not print response bodies which could reflect an uploaded image/key.
            raise RequestRejected('MESHY_HTTP_'+str(error.code)) from None
    def download(self, url, destination):
        base=urlparse(self.base)
        def allowed(value):
            u=urlparse(value)
            if u.username or u.password:return False
            if base.scheme=='http':return u.scheme=='http' and u.netloc==base.netloc
            return u.scheme=='https' and (u.hostname=='meshy.ai' or (u.hostname or '').endswith('.meshy.ai'))
        if not allowed(url):raise ValueError('ASSET_ORIGIN_UNSUPPORTED')
        class CheckedRedirect(HTTPRedirectHandler):
            def redirect_request(self,req,fp,code,msg,headers,newurl):
                if not allowed(newurl):raise ValueError('ASSET_REDIRECT_UNSUPPORTED')
                return super().redirect_request(req,fp,code,msg,headers,newurl)
        # Asset requests NEVER receive the API Authorization header.
        with build_opener(CheckedRedirect()).open(Request(url),timeout=30) as response, destination.open('wb') as out:
            total=0
            while True:
                chunk=response.read(1024*1024)
                if not chunk:break
                total+=len(chunk)
                if total>200*1024*1024:raise ValueError('GLB_ASSET_BUDGET_EXCEEDED')
                out.write(chunk)
