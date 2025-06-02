import type { APIRoute } from 'astro';
import { generateSearchIndex } from '../utils/searchIndex';

export const GET: APIRoute = async () => {
  try {
    const searchIndex = await generateSearchIndex();
    
    return new Response(JSON.stringify(searchIndex), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error generating search index:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to generate search index' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}; 