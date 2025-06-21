"use client";
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

/**
 * Props for the ContentFormatter component.
 * @interface ContentFormatterProps
 */
interface ContentFormatterProps {
  /** The Markdown content to render */
  content: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Theme for styling (e.g., 'dark', 'light') */
  theme?: 'dark' | 'light';
  /** Font size scale (e.g., 'sm', 'md', 'lg') */
  fontSize?: 'sm' | 'md' | 'lg';
  /** Custom styles for specific elements */
  customStyles?: {
    heading?: string;
    paragraph?: string;
    code?: string;
    blockquote?: string;
    link?: string;
    list?: string;
  };
}

/**
 * A robust Markdown content formatter with support for GFM, LaTeX, code highlighting,
 * and customizable styling.
 * @param props - Component props
 * @returns A formatted Markdown content component
 */
const ContentFormatter: React.FC<ContentFormatterProps> = ({
  content,
  className = '',
  theme = 'dark',
  fontSize = 'md',
  customStyles = {},
}) => {
  // Font size classes based on prop
  const fontSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  // Theme-based styles
  const themeStyles = {
    dark: {
      text: 'text-neutral-200',
      heading: 'text-white',
      code: 'text-green-400 bg-neutral-800',
      codeBlock: 'bg-neutral-900',
      blockquote: 'text-neutral-300 border-blue-500',
      link: 'text-blue-400 hover:text-blue-300',
    },
    light: {
      text: 'text-gray-800',
      heading: 'text-gray-900',
      code: 'text-green-600 bg-gray-100',
      codeBlock: 'bg-gray-50',
      blockquote: 'text-gray-600 border-blue-300',
      link: 'text-blue-600 hover:text-blue-500',
    },
  };

  const currentTheme = themeStyles[theme];

  // Custom component renderers for Markdown elements
  const components = {
    // Headings
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1
        className={`font-bold ${currentTheme.heading} mt-6 mb-4 ${fontSizeClasses[fontSize]} ${customStyles.heading || ''}`}
        role="heading"
        aria-level={1}
      >
        {children}
      </h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2
        className={`font-semibold ${currentTheme.heading} mt-5 mb-3 ${fontSizeClasses[fontSize]} ${customStyles.heading || ''}`}
        role="heading"
        aria-level={2}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3
        className={`font-medium ${currentTheme.heading} mt-4 mb-2 ${fontSizeClasses[fontSize]} ${customStyles.heading || ''}`}
        role="heading"
        aria-level={3}
      >
        {children}
      </h3>
    ),
    h4: ({ children }: { children: React.ReactNode }) => (
      <h4
        className={`font-medium ${currentTheme.heading} mt-3 mb-2 ${fontSizeClasses[fontSize]} ${customStyles.heading || ''}`}
        role="heading"
        aria-level={4}
      >
        {children}
      </h4>
    ),    // Paragraph
    p: ({ children }: { children: React.ReactNode }) => {
      // Check if children contains block elements like pre, div, etc.
      const hasBlockElements = React.Children.toArray(children).some((child) => {
        if (React.isValidElement(child)) {
          const type = child.type as string;
          return ['pre', 'div', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(type);
        }
        return false;
      });

      // If it contains block elements, render as div instead of p
      if (hasBlockElements) {
        return (
          <div
            className={`${currentTheme.text} my-2 leading-relaxed ${fontSizeClasses[fontSize]} ${customStyles.paragraph || ''}`}
          >
            {children}
          </div>
        );
      }

      return (
        <p
          className={`${currentTheme.text} my-2 leading-relaxed ${fontSizeClasses[fontSize]} ${customStyles.paragraph || ''}`}
        >
          {children}
        </p>
      );
    },

    // Code (inline and block)
    code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children: React.ReactNode }) => {
      if (inline) {
        return (
          <code
            className={`${currentTheme.code} px-1 py-0.5 rounded text-sm font-mono ${customStyles.code || ''}`}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <div className={`${currentTheme.codeBlock} rounded-md p-3 my-4 overflow-auto`}>
          <pre className={`text-sm ${currentTheme.code} ${className || ''}`}>
            <code {...props}>{children}</code>
          </pre>
        </div>
      );
    },

    // Blockquote
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote
        className={`border-l-4 ${currentTheme.blockquote} pl-4 py-1 my-3 italic ${customStyles.blockquote || ''}`}
        role="blockquote"
      >
        {children}
      </blockquote>
    ),

    // Links
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${currentTheme.link} underline ${customStyles.link || ''}`}
        aria-label={`Link to ${href}`}
      >
        {children}
      </a>
    ),

    // Lists
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul
        className={`list-disc list-outside ml-6 my-2 ${currentTheme.text} ${customStyles.list || ''}`}
        role="list"
      >
        {children}
      </ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol
        className={`list-decimal list-outside ml-6 my-2 ${currentTheme.text} ${customStyles.list || ''}`}
        role="list"
      >
        {children}
      </ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="my-1" role="listitem">
        {children}
      </li>
    ),

    // Horizontal rule
    hr: () => <hr className="border-neutral-600 my-4" aria-hidden="true" />,

    // Strong (bold)
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className={`font-semibold ${currentTheme.heading}`}>
        {children}
      </strong>
    ),

    // Emphasis (italic)
    em: ({ children }: { children: React.ReactNode }) => (
      <em className={`italic ${currentTheme.text}`}>
        {children}
      </em>
    ),

    // Table
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="overflow-x-auto my-4">
        <table className={`w-full border-collapse ${currentTheme.text}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => (
      <thead className={`${currentTheme.heading} bg-neutral-800`}>{children}</thead>
    ),
    tbody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
    th: ({ children }: { children: React.ReactNode }) => (
      <th className="border border-neutral-600 px-4 py-2 text-left">{children}</th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className="border border-neutral-600 px-4 py-2">{children}</td>
    ),

    // Images
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <img
        src={src}
        alt={alt || 'Image'}
        className="max-w-full h-auto my-4 rounded"
        loading="lazy"
      />
    ),

    // Strikethrough
    del: ({ children }: { children: React.ReactNode }) => (
      <del className="line-through text-neutral-400">{children}</del>
    ),

    // Task list items (checkboxes)
    input: ({ type, checked }: { type?: string; checked?: boolean }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-2"
            aria-checked={checked}
          />
        );
      }
      return null;
    },
  };

  // Handle rendering errors
  try {
    return (
      <div className={`formatted-content ${className}`} role="region" aria-label="Formatted content">
        {content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight, rehypeKatex]}
            components={components}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <p className="text-red-500">No content provided.</p>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error rendering Markdown:', error);
    return (
      <div className={`formatted-content ${className}`} role="alert">
        <p className="text-red-500">
          Failed to render content. Please check the Markdown syntax.
        </p>
      </div>
    );
  }
};

// Memoize the component to prevent unnecessary re-renders
export default memo(ContentFormatter);