import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { feedbacks } = await req.json();

  if (!feedbacks?.length) {
    return new Response('No feedback provided', { status: 400 });
  }

  const lines = feedbacks.map((f: any, i: number) => {
    const ratings = [
      f.ratingOverall && `Overall: ${f.ratingOverall}/5`,
      f.ratingFood && `Food: ${f.ratingFood}/5`,
      f.ratingService && `Service: ${f.ratingService}/5`,
      f.ratingAmbiance && `Ambiance: ${f.ratingAmbiance}/5`,
      f.ratingValue && `Value: ${f.ratingValue}/5`,
    ].filter(Boolean).join(', ');
    const comment = f.comment ? `Comment: "${f.comment}"` : '';
    return `${i + 1}. [${ratings}] ${comment}`;
  }).join('\n');

  const prompt = `You are analyzing ${feedbacks.length} customer feedback entries for a restaurant. Based on the ratings and comments below, give a concise summary of what customers love and what needs improvement.

FEEDBACK DATA:
${lines}

Respond in exactly this format:
POSITIVES:
- [specific positive point from the data]
- [specific positive point from the data]
- [specific positive point from the data]

NEGATIVES:
- [specific area of concern from the data]
- [specific area of concern from the data]
- [specific area of concern from the data]

Keep each point short (1 sentence). Be specific and data-driven. If there are fewer positives or negatives, include fewer points.`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const s = client.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        });
        for await (const event of s) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(enc.encode(`data: ${event.delta.text}\n\n`));
          }
        }
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        controller.enqueue(enc.encode(`data: Error: ${msg}\n\n`));
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
