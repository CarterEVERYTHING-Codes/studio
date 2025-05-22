
'use client';
import Link, { type LinkProps } from 'next/link';
import { useNavigation } from '@/contexts/NavigationContext';
import React from 'react';
import { usePathname } from 'next/navigation';

type LoadingLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & {
  children?: React.ReactNode;
  className?: string;
};

export const LoadingLink = ({ children, href, onClick, ...props }: LoadingLinkProps) => {
  const { setIsNavigating } = useNavigation();
  const currentPathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const targetUrl = typeof href === 'string' ? href : href.pathname || '';
    
    // Check if it's a primary click, not a new tab click, etc.
    // Also check if the link is internal and not just a hash link on the same page
    if (e.ctrlKey || e.metaKey || e.button !== 0 || targetUrl === currentPathname || targetUrl.startsWith('#') ) {
      if (onClick) {
        onClick(e); // Still call original onClick if it exists
      }
      return;
    }
    
    if (targetUrl && (targetUrl.startsWith('/') || typeof href === 'object')) {
        setIsNavigating(true);
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link href={href} {...props} onClick={handleClick}>
      {children}
    </Link>
  );
};
