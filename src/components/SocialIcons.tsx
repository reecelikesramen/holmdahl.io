import { Github, Twitter, Linkedin, Mail, Facebook, Instagram, Youtube, Rss } from 'lucide-react';
import type { ComponentProps } from 'react';

interface SocialIconsProps {
  align?: 'left' | 'center' | 'right';
  className?: string;
  icons: Array<{
    name: string;
    url: string;
    title?: string;
  }>;
}

const iconComponents: Record<string, React.ComponentType<ComponentProps<typeof Github>>> = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  email: Mail,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  rss: Rss,
};

export function SocialIcons({ align = 'center', className = '', icons }: SocialIconsProps) {
  return (
    <div 
      className={`flex gap-4 ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'} ${className}`}
    >
      {icons.map(({ name, url, title }) => {
        const IconComponent = iconComponents[name.toLowerCase()] || null;
        if (!IconComponent) return null;
        
        return (
          <a 
            key={name}
            href={url}
            target="_blank" 
            rel="noopener noreferrer me"
            title={title || name}
            className="text-secondary-foreground hover:text-primary-foreground transition-colors"
          >
            <IconComponent size={20} />
          </a>
        );
      })}
    </div>
  );
} 