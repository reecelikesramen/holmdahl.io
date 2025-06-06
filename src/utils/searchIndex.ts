import { getCollection, getEntry } from 'astro:content';
import { createAbsoluteUrl } from './paths';

export interface SearchIndexItem {
  title: string;
  url: string;
  content: string;
  summary?: string;
  tags?: string[];
}

export async function generateSearchIndex(): Promise<SearchIndexItem[]> {
  const searchIndex: SearchIndexItem[] = [];

  // Add about page from content collection
  try {
    const aboutEntry = await getEntry('about', 'index');
    if (aboutEntry) {
      searchIndex.push({
        title: aboutEntry.data.title,
        url: createAbsoluteUrl('/about'),
        content: cleanTextForSearch(`${aboutEntry.data.title} ${aboutEntry.data.description || ''} ${aboutEntry.body}`),
        summary: aboutEntry.data.description,
      });
    }
  } catch (error) {
    console.warn('Could not load about page for search index:', error);
  }

  // Add blog posts from posts directory
  try {
    // Use dynamic import to avoid SSR issues
    const postFiles = import.meta.glob('/src/pages/posts/*.{md,mdx}', { eager: true });
    
    for (const [path, post] of Object.entries(postFiles)) {
      const postData = post as any;
      
      if (postData.frontmatter && !postData.frontmatter.draft) {
        // Extract slug from file path
        const slug = path.split('/').pop()?.replace(/\.(md|mdx)$/, '');
        const url = createAbsoluteUrl(`/posts/${slug}`);
        
        // Try to get the raw content from the module
        let rawContent = '';
        if (postData.rawContent && typeof postData.rawContent === 'function') {
          rawContent = postData.rawContent();
        } else if (postData.body) {
          rawContent = postData.body;
        } else if (postData.compiledContent && typeof postData.compiledContent === 'function') {
          try {
            rawContent = await postData.compiledContent();
          } catch {
            // If compiled content fails, try to extract from other properties
            rawContent = '';
          }
        }
        
        // Combine frontmatter and content for search
        const content = cleanTextForSearch(
          `${postData.frontmatter.title} ${postData.frontmatter.description || ''} ${rawContent}`
        );
        
        searchIndex.push({
          title: postData.frontmatter.title,
          url,
          content,
          summary: postData.frontmatter.description,
          tags: postData.frontmatter.tags || [],
        });
      }
    }
  } catch (error) {
    console.warn('Could not load blog posts for search index:', error);
  }

  // Add other static pages that should be searchable
  const staticPages = [
    {
      title: 'Projects',
      url: createAbsoluteUrl('/projects'),
      content: cleanTextForSearch('Projects page showcasing development work and contributions.'),
      summary: 'View my projects and development work',
    },
    {
      title: 'Resume',
      url: createAbsoluteUrl('/resume'),
      content: cleanTextForSearch('Resume page with professional experience and qualifications.'),
      summary: 'Professional experience and qualifications',
    }
  ];

  searchIndex.push(...staticPages);

  return searchIndex;
}

// Function to clean and prepare text for search
export function cleanTextForSearch(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .replace(/[^\w\s-]/g, ' ') // Remove special characters except hyphens
    .trim()
    .toLowerCase();
} 