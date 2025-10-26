"use client";
import { useEffect, useMemo, useState } from 'react';

type Provider = 'demo' | 'replicate' | 'huggingface';

export default function HomePage() {
  const [prompt, setPrompt] = useState('a playful corgi running through a field of flowers, cinematic, 4k');
  const [provider, setProvider] = useState<Provider>('demo');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<string>('Idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('agentic-token');
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (provider === 'demo') return;
    if (token) localStorage.setItem('agentic-token', token);
  }, [token, provider]);

  const canSubmit = useMemo(() => {
    if (provider === 'demo') return true;
    return token.trim().length > 0;
  }, [provider, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setStatus('Submitting');
    setVideoUrl(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider, token: provider === 'demo' ? undefined : token })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Request failed');
      }
      setStatus('Processing');
      const { jobId } = await res.json();

      // poll
      let tries = 0;
      while (tries < 120) { // up to ~2 minutes
        tries++;
        const s = await fetch(`/api/generate?jobId=${encodeURIComponent(jobId)}`);
        if (!s.ok) throw new Error('Polling failed');
        const data = await s.json();
        if (data.status === 'succeeded' && data.url) {
          setVideoUrl(data.url);
          setStatus('Done');
          break;
        }
        if (data.status === 'failed') throw new Error(data.error || 'Generation failed');
        await new Promise(r => setTimeout(r, 1000));
      }
      if (tries >= 120) throw new Error('Timed out');
    } catch (err: any) {
      setStatus(err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="panel">
        <form className="row" onSubmit={handleSubmit}>
          <textarea className="input" rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} />
          <div className="row" style={{width:'100%'}}>
            <select className="input select" value={provider} onChange={e=>setProvider(e.target.value as Provider)}>
              <option value="demo">Demo (sample video)</option>
              <option value="replicate">Replicate (requires API token)</option>
              <option value="huggingface">Hugging Face (requires API token)</option>
            </select>
            <input className="input" type="password" placeholder="Provider API Token (stored locally)" value={token} onChange={e=>setToken(e.target.value)} disabled={provider==='demo'} />
            <button className="button" disabled={!canSubmit || isLoading}>
              {isLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
        <p className="small">Status: {status}</p>
        <p className="small">This UI adds no watermark. Third‑party providers may apply their own terms.</p>
      </section>
      <section className="panel">
        {videoUrl ? (
          <div>
            <video className="video" src={videoUrl} controls playsInline />
            <div className="row" style={{marginTop:12}}>
              <a className="button" href={videoUrl} download>Download</a>
              <span className="badge">Length depends on provider/model</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="badge">Preview</div>
            <Placeholder />
          </div>
        )}
      </section>
    </div>
  );
}

function Placeholder() {
  return (
    <div style={{border:'1px dashed #223044',borderRadius:12,padding:16}}>
      <p className="small">No video yet. Try the Demo provider to preview.</p>
    </div>
  );
}
