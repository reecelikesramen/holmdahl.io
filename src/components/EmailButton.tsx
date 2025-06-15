import { Mail } from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmailButtonProps {
  email: string;
}

export default function EmailButton({ email }: EmailButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setOpen(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 2000);
    } catch (err) {
      console.log(email);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            aria-label="Copy email address" 
            onClick={handleClick}
            className="transition-colors duration-200 hover:no-underline text-secondary-color hover:text-primary-color"
          >
            <Mail size={24} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Email copied!' : 'Copy email address'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 