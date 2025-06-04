import React from "react";
import { Button, buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";

export interface ButtonLinkProps extends React.ComponentProps<"a">, 
  VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

const ButtonLink: React.FC<ButtonLinkProps> = ({ children, variant, size, className, ...props }) => {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <a {...props}>{children}</a>
    </Button>
  );
};

export { ButtonLink }; 