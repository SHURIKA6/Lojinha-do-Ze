/**
 * Definições de Tipos: styled-jsx.d
 */

import 'react';

declare module 'react' {
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
    jsxConfig?: any;
  }
}
