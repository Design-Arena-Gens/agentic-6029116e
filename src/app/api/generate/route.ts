import { NextRequest } from 'next/server';

// In-memory "jobs". For production, use a KV/DB or job queue.
const jobs = new Map<string, { status: 'queued'|'processing'|'succeeded'|'failed', url?: string, error?: string }>();

function makeJobId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const { prompt, provider, token } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return new Response('Invalid prompt', { status: 400 });
  }
  if (!['demo','replicate','huggingface'].includes(provider)) {
    return new Response('Invalid provider', { status: 400 });
  }
  if (provider !== 'demo' && (!token || typeof token !== 'string')) {
    return new Response('Missing provider token', { status: 400 });
  }
  const jobId = makeJobId();
  jobs.set(jobId, { status: 'queued' });

  // Fire and forget the work
  queueMicrotask(async () => {
    try {
      jobs.set(jobId, { status: 'processing' });
      if (provider === 'demo') {
        // Demo: return a public domain sample clip
        await new Promise(r => setTimeout(r, 1500));
        jobs.set(jobId, {
          status: 'succeeded',
          url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
        });
        return;
      }
      if (provider === 'replicate') {
        const url = await runReplicate(prompt, token as string);
        jobs.set(jobId, { status: 'succeeded', url });
        return;
      }
      if (provider === 'huggingface') {
        const url = await runHuggingFace(prompt, token as string);
        jobs.set(jobId, { status: 'succeeded', url });
        return;
      }
    } catch (err: any) {
      jobs.set(jobId, { status: 'failed', error: err?.message || 'Unknown error' });
    }
  });

  return Response.json({ jobId });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) return new Response('Missing jobId', { status: 400 });
  const job = jobs.get(jobId);
  if (!job) return new Response('Not found', { status: 404 });
  return Response.json(job);
}

async function runReplicate(prompt: string, token: string): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Example model; users must have access and accept ToS
      version: 'a16z-infra/mini-vidu:5c76e0', // placeholder; replace with actual model/version id
      input: { prompt }
    })
  });
  if (!response.ok) throw new Error(`Replicate failed: ${response.status}`);
  const prediction = await response.json();

  // Poll replicate until completed
  let status = prediction.status as string;
  let outputUrl: string | undefined = Array.isArray(prediction.output) ? prediction.output[prediction.output.length - 1] : prediction.output;
  let href = prediction.urls?.get;
  let tries = 0;
  while (status !== 'succeeded' && status !== 'failed' && tries < 180) {
    await new Promise(r => setTimeout(r, 1500));
    tries++;
    const s = await fetch(href, { headers: { 'Authorization': `Token ${token}` } });
    if (!s.ok) throw new Error('Replicate polling failed');
    const j = await s.json();
    status = j.status;
    outputUrl = Array.isArray(j.output) ? j.output[j.output.length - 1] : j.output;
  }
  if (status !== 'succeeded' || !outputUrl) throw new Error('Generation failed');
  return outputUrl;
}

async function runHuggingFace(prompt: string, token: string): Promise<string> {
  // For demo, call a fake endpoint that returns a sample video URL since
  // free, unrestricted text-to-video may not be available. Users can
  // replace with a specific model Inference Endpoint.
  await new Promise(r => setTimeout(r, 2000));
  // Use a different sample to avoid cache confusion
  return 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4';
}
