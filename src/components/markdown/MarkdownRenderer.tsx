'use client';

import 'katex/dist/katex.min.css';

import React, { type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlockMath, InlineMath } from 'react-katex';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/client/utils';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

function renderMathInText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const blockMatch = remaining.match(/\$\$([\s\S]+?)\$\$/);
    const inlineMatch = remaining.match(/\$([^$\n]+?)\$/);

    if (!blockMatch && !inlineMatch) {
      nodes.push(remaining);
      break;
    }

    let earliestIndex = Infinity;
    let isBlock = false;

    if (blockMatch && blockMatch.index !== undefined) {
      earliestIndex = blockMatch.index;
      isBlock = true;
    }

    if (inlineMatch && inlineMatch.index !== undefined && inlineMatch.index < earliestIndex) {
      earliestIndex = inlineMatch.index;
      isBlock = false;
    }

    if (earliestIndex > 0) {
      nodes.push(remaining.slice(0, earliestIndex));
    }

    if (isBlock && blockMatch) {
      nodes.push(<BlockMath key={key++} math={blockMatch[1].trim()} />);
      remaining = remaining.slice(blockMatch.index! + blockMatch[0].length);
    } else if (inlineMatch) {
      nodes.push(<InlineMath key={key++} math={inlineMatch[1].trim()} />);
      remaining = remaining.slice(inlineMatch.index! + inlineMatch[0].length);
    } else {
      break;
    }
  }

  return nodes;
}

function htmlProps<T extends { node?: unknown }>(props: T) {
  const { node, ...attributes } = props;
  void node;
  return attributes;
}

const components: Components = {
  p: ({ children, ...props }) => {
  const process = (child: ReactNode): ReactNode => {
    if (typeof child === 'string') {
      const result = renderMathInText(child);
      return result.length === 1 ? result[0] : result;
    }
    if (Array.isArray(child)) {
      return child.map((c, i) => (
        <React.Fragment key={i}>{process(c)}</React.Fragment>
      ));
    }
    return child;
  };
  return (
    <div className="leading-7 text-foreground mb-4" {...htmlProps(props)}>
      {Array.isArray(children) ? children.map((c, i) => (
        <React.Fragment key={i}>{process(c)}</React.Fragment>
      )) : process(children)}
    </div>
  );
},
  h3: ({ children, ...props }) => (
    <h3 className="font-semibold text-lg mb-2 mt-4 text-foreground" {...htmlProps(props)}>{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="font-semibold text-base mb-1 mt-3 text-foreground" {...htmlProps(props)}>{children}</h4>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc ml-5 space-y-1 text-foreground mb-4" {...htmlProps(props)}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal ml-5 space-y-1 text-foreground mb-4" {...htmlProps(props)}>{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-foreground" {...htmlProps(props)}>{children}</li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-4" {...htmlProps(props)}>{children}</blockquote>
  ),
  pre: ({ children, ...props }) => <pre className="my-4 max-w-full overflow-x-auto rounded-lg border border-border bg-sidebar p-4 text-sm" {...htmlProps(props)}>{children}</pre>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = match || (className && className.includes('language-'));
    if (isBlock) {
      return (
        <code className={cn(className, 'text-foreground')} {...htmlProps(props)}>{children}</code>
      );
    }
    return (
      <code className="bg-popover rounded px-1 text-primary text-[0.9em] font-mono" {...htmlProps(props)}>{children}</code>
    );
  },
  a: ({ children, ...props }) => (
    <a {...htmlProps(props)} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
      {children}
    </a>
  ),
  hr: () => <hr className="border-border my-6" />,
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse text-sm" {...htmlProps(props)}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold bg-popover" {...htmlProps(props)}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-3 py-2" {...htmlProps(props)}>{children}</td>
  ),
};

export default function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={cn('min-w-0 break-words text-foreground [&>*:last-child]:mb-0 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
