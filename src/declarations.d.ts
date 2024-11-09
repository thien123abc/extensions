declare module '*.svg' {
  const content: any;
  export default content;
}
declare module 'dompurify' {
  const dompurify: any;
  export default dompurify;
}
declare module 'prismjs' {
  const Prism: any;
  export = Prism;
}

// src/types/katex.d.ts
declare module 'katex' {
  export function render(math: string, element: HTMLElement, options?: any): void;
  export function renderToString(math: string, options?: any): string;
  export function version(): string;
}
