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

  // Add static pages (excluding home page)
  searchIndex.push(
    {
      title: 'About',
      url: '/about',
      content: 'About page containing information about my background, experience, and interests.',
      summary: 'Learn more about my background and experience',
    }
  );

  // Add sample projects (these would be real projects in a real implementation)
  searchIndex.push(
    {
      title: 'Project Alpha',
      url: '/projects/alpha',
      content: 'A detailed description of Project Alpha, including technologies used and challenges overcome.',
      summary: 'An innovative web application built with modern technologies',
      tags: ['web', 'javascript', 'react'],
    },
    {
      title: 'Project Beta',
      url: '/projects/beta',
      content: 'Project Beta showcases advanced data visualization techniques and user interface design.',
      summary: 'Data visualization dashboard with interactive charts',
      tags: ['data', 'visualization', 'dashboard'],
    }
  );

  // Add sample blog posts (these would be real posts in a real implementation)
  searchIndex.push(
    {
      title: 'Getting Started with Astro',
      url: '/posts/getting-started-astro',
      content: 'A comprehensive guide to building static sites with Astro framework, covering setup, components, and deployment.',
      summary: 'Learn how to build fast static sites with Astro',
      tags: ['astro', 'tutorial', 'web development'],
    },
    {
      title: 'Modern CSS Techniques',
      url: '/posts/modern-css-techniques',
      content: 'Exploring the latest CSS features including grid, flexbox, custom properties, and container queries.',
      summary: 'Discover powerful CSS features for modern web development',
      tags: ['css', 'web design', 'frontend'],
    },
    {
      title: 'TypeScript Best Practices',
      url: '/posts/typescript-best-practices',
      content: 'Essential TypeScript patterns and practices for building maintainable and type-safe applications.',
      summary: 'Write better TypeScript code with these proven patterns',
      tags: ['typescript', 'javascript', 'best practices'],
    }
  );

  // TODO: Replace sample data with actual content from collections when they're set up
  // This would be done with getCollection('blog') and getCollection('projects')

  return searchIndex;
}

// Function to clean and prepare text for search
export function cleanTextForSearch(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim()
    .toLowerCase();
} 