declare module "react-katex" {
  import type { ReactNode } from "react";
  import type { KatexOptions } from "katex";

  export interface TeXProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: KatexOptions;
  }

  export function BlockMath(props: TeXProps): JSX.Element;
  export function InlineMath(props: TeXProps): JSX.Element;
}
