import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../lib/utils";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  const { className, ...rest } = props;
  return <button className={cn("bg-primary text-primary-foreground rounded px-3 py-2", className)} {...rest} />;
}
