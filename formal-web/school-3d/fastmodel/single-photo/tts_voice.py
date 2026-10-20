"""FastModel 3.6 — opt-in speech audio, actual WAV bytes only.
No calls at startup; requests only after explicit user POST. Never retry paid requests.
No photos, GLB or model files leave the local service for this endpoint.
"""
import json
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPRedirectHandler

API_URL = 'https://api.openai.com/v1/audio/speech'
VOICE_MODELS = {'gpt-4o-mini-tts'}
VOICES = {'alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer','verse','marin','cedar'}
MAX_WAV_BYTES = 4 * 1024 * 1024

def validate_tts_request(data):
    if not isinstance(data,dict): raise ValueError('TTS_JSON_REQUIRED')
    if set(data) != {'beat','text','voice'}: raise ValueError('TTS_FIELDS_INVALID')
    beat=data['beat']; phrase=data['text']; voice=data['voice']
    if type(beat) is not int or not 0 <= beat < 20: raise ValueError('TTS_BEAT_INVALID')
    if not isinstance(phrase,str) or not 1 <= len(phrase.strip()) <= 240 or any(ord(c)<32 for c in phrase):
        raise ValueError('TTS_TEXT_INVALID')
    if not isinstance(voice,str) or voice not in VOICES: raise ValueError('TTS_VOICE_INVALID')
    return {'beat':beat,'text':phrase.strip(),'voice':voice}

def _request_wav(payload,key):
    raw=json.dumps(payload,ensure_ascii=False).encode('utf8')
    req=Request(API_URL,data=raw,headers={
        'Authorization':'Bearer '+key,'Content-Type':'application/json',
        'Accept':'audio/wav','User-Agent':'AIG-FastModel/3.6'},method='POST')
    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):return None
    try:
        with build_opener(NoRedirect()).open(req,timeout=45) as response:
            out=response.read(MAX_WAV_BYTES+1)
            if len(out)>MAX_WAV_BYTES:raise ValueError('TTS_WAV_TOO_LARGE')
            return out
    except HTTPError as error:
        raise RuntimeError('TTS_PROVIDER_HTTP_'+str(error.code)) from None

def validate_wav(data):
    if not isinstance(data,bytes) or not 44<=len(data)<=MAX_WAV_BYTES:
        raise ValueError('TTS_WAV_INVALID')
    if data[:4]!=b'RIFF' or data[8:12]!=b'WAVE':
        raise ValueError('TTS_WAV_HEADER_INVALID')
    if int.from_bytes(data[4:8],'little')+8 != len(data):
        raise ValueError('TTS_WAV_LENGTH_INVALID')
    if b'fmt ' not in data[12:128] or b'data' not in data[12:]:
        raise ValueError('TTS_WAV_CHUNKS_INVALID')
    return data

class SpeechAI:
    def __init__(self,key='',model='gpt-4o-mini-tts',transport=None):
        self._key=(key or '').strip()
        if model not in VOICE_MODELS:raise ValueError('TTS_MODEL_UNSUPPORTED')
        self.model=model;self.transport=transport or _request_wav
    @property
    def configured(self):return bool(self._key)
    def generate(self,data):
        if not self.configured:raise ValueError('TTS_NOT_CONFIGURED')
        cue=validate_tts_request(data)
        payload={
            'model':self.model,'voice':cue['voice'],'input':cue['text'],
            'instructions':'以自然、清楚的繁體中文演繹一位虛構動畫女主角；語調明快、富有表情。',
            'response_format':'wav'
        }
        return validate_wav(self.transport(payload,self._key))
