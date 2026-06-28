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

    const prompt = `You are an expert event marketing copywriter and AI prompt engineer.
Event: "${eventName}" | Date: ${eventDate} | Venue: ${venue} | Theme: ${theme} | Style: ${style}
Return ONLY valid JSON (no markdown) with keys:
{ "copy": "2-3 sentence description", "tagline": "under 8 words", "imagePrompt": "EXTREMELY detailed, highly aesthetic, attention-grabbing prompt for an AI image generator. Include specific lighting, atmosphere, style, camera angles, and stunning visuals to make the flyer pop. NO TEXT or words in the image itself.", ${captionSection} }`;

    let text: string;
    try {
      const response = await generateText({ model: openai('gpt-4o-mini'), prompt, maxRetries: 0 });
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

    // Optional image generation using Pollinations.ai (Free, no API key required!)
    if (generateImage && result.imagePrompt) {
      try {
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(result.imagePrompt);
        // We use the URL directly, avoiding DynamoDB 400KB base64 limits!
        result.imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
      } catch (e) { 
        console.warn('[ai] Pollinations failed:', e); 
        result.imageUrl = null; 
      }
    }

    return apiSuccess(result);
  } catch (err) {
    logError('POST /api/ai/generate-flyer', err);
    return apiError('Internal server error', 500);
  }
}
