import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { z } from 'zod';
import { checkRateLimit, rateLimitHeaders } from '@/lib/ratelimit';
import { logError } from '@/lib/logger';

const flyerSchema = z.object({
  eventName: z.string().min(2).max(120),
  eventDate: z.string(),
  venue: z.string(),
  theme: z.string().max(100).optional(),
  style: z.string().max(100).optional(),
  generateImage: z.boolean().optional().default(false),
  generateCaptions: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const rateLimit = await checkRateLimit(ip, 'ai-flyer');
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
    }

    const user = await requireAuth();
    if (!user) return apiError('Unauthorized', 401);

    const body = await req.json().catch(() => null);
    const parsed = flyerSchema.safeParse(body);
    if (!parsed.success) return apiError('Invalid input', 422);

    const { eventName, eventDate, venue, theme = 'modern', style = 'vibrant', generateImage, generateCaptions } = parsed.data;

    const captionSection = generateCaptions
      ? `"captions": { "twitter": "tweet under 280 chars with hashtags", "linkedin": "professional 2-sentence post", "instagram": "caption under 150 chars with hashtags" }`
      : '"captions": null';

    const prompt = `You are a creative event marketing copywriter.
Event: "${eventName}" | Date: ${eventDate} | Venue: ${venue} | Theme: ${theme} | Style: ${style}
Return ONLY valid JSON (no markdown) with keys:
{ "copy": "2-3 sentence description", "tagline": "under 8 words", "imagePrompt": "detailed SDXL prompt for 1024x1024 flyer", ${captionSection} }`;

    let text: string;
    try {
      const response = await generateText({ model: openai('gpt-4o-mini'), prompt });
      text = response.text;
    } catch (aiError) {
      console.warn('[ai] generateText failed, using fallback mock data:', aiError);
      text = JSON.stringify({
        copy: `Experience an unforgettable time at ${eventName}. Join us for a spectacular event filled with amazing moments.`,
        tagline: `Don't miss out on the best ${theme} event.`,
        imagePrompt: `A vibrant and modern promotional flyer for an event named ${eventName} with a ${theme} theme.`,
        captions: generateCaptions ? {
          twitter: `Get ready for ${eventName}! 🚀 Grab your tickets now. #event #${theme.replace(/\s+/g, '')}`,
          linkedin: `We are thrilled to announce ${eventName}. Join industry peers at ${venue} for an exceptional experience.`,
          instagram: `✨ ${eventName} is happening! Secure your spot now. 🎟️ ✨ #events`
        } : null
      });
    }

    let result: any;
    try { result = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { return apiError('AI response invalid. Please try again.', 500); }

    // Optional Replicate image generation
    if (generateImage && result.imagePrompt && process.env.REPLICATE_API_TOKEN) {
      try {
        const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4',
            input: { prompt: result.imagePrompt, width: 1024, height: 1024, num_outputs: 1, num_inference_steps: 25 },
          }),
        });
        if (replicateRes.ok) {
          const prediction = await replicateRes.json();
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
              headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
            });
            const pollData = await poll.json();
            if (pollData.status === 'succeeded') { result.imageUrl = pollData.output?.[0] ?? null; break; }
            if (pollData.status === 'failed') break;
          }
        }
      } catch (e) { console.warn('[ai] Replicate failed:', e); result.imageUrl = null; }
    }

    return apiSuccess(result);
  } catch (err) {
    logError('POST /api/ai/generate-flyer', err);
    return apiError('Internal server error', 500);
  }
}
