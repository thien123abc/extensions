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

// src/types/react-mathjax2.d.ts
declare module 'react-mathjax2' {
  const MathJax: any;
  const MathJaxContext: any;
  const MathJaxProvider: any;

  export { MathJax, MathJaxContext, MathJaxProvider };
}
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}


declare module 'react-katex';
