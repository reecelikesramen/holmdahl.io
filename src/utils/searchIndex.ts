import { getCollection } from 'astro:content';

export interface SearchIndexItem {
  title: string;
  url: string;
  content: string;
  summary?: string;
  tags?: string[];
}

export async function generateSearchIndex(): Promise<SearchIndexItem[]> {
  const searchIndex: SearchIndexItem[] = [];

  // Add blog posts from content collections
  try {
    const posts = await getCollection("posts");
    const publishedPosts = posts.filter(post => !post.data.draft);
    
    for (const post of publishedPosts) {
      const url = `/posts/${post.slug}`;
      
      // Get the content from the post body
      const content = cleanTextForSearch(
        `${post.data.title} ${post.data.description || ''} ${post.body}`
      );
      
      searchIndex.push({
        title: post.data.title,
        url,
        content,
        summary: post.data.description,
        tags: post.data.tags || [],
      });
    }
  } catch (error) {
    console.warn('Could not load blog posts for search index:', error);
  }

  // Add projects from content collections
  try {
    const projects = await getCollection("projects");
    const publishedProjects = projects.filter(project => !project.data.draft);
    
    for (const project of publishedProjects) {
      const url = `/projects/${project.slug}`;
      
      // Get the content from the project body
      const content = cleanTextForSearch(
        `${project.data.title} ${project.data.description || ''} ${project.body}`
      );
      
      searchIndex.push({
        title: project.data.title,
        url,
        content,
        summary: project.data.description,
        // Projects don't have tags in the schema
      });
    }
  } catch (error) {
    console.warn('Could not load projects for search index:', error);
  }

  // Add other static pages that should be searchable
  const staticPages = [
    {
      title: 'About',
      url: '/about',
      content: cleanTextForSearch('About page with information about Reece Holmdahl, software engineer and mathematician.'),
      summary: 'Learn more about Reece Holmdahl',
    },
    {
      title: 'Projects',
      url: '/projects',
      content: cleanTextForSearch('Projects page showcasing development work and contributions.'),
      summary: 'View my projects and development work',
    },
    {
      title: 'Resume',
      url: '/resume',
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