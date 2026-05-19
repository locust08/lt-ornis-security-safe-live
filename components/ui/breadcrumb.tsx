import * as React from "react";

import { cn } from "@/lib/utils";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("text-muted-foreground flex flex-wrap items-center gap-2 text-sm", className)} {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("inline-flex items-center gap-2", className)} {...props} />;
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) {
  return <a className={cn("hover:text-foreground transition-colors", className)} {...props} />;
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-foreground font-medium", className)} {...props} />;
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
      {children ?? "/"}
    </li>
  );
}

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
