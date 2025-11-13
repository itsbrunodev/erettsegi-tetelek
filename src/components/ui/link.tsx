import type { VariantProps } from "class-variance-authority";
import type React from "react";

import { Button, type buttonVariants } from "./button";

export interface LinkProps extends VariantProps<typeof buttonVariants> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const Link: React.FC<LinkProps> = ({ href, children, className, ...props }) => {
  return (
    <Button {...props} className={className} asChild>
      <a href={href}>{children}</a>
    </Button>
  );
};

export { Link };
