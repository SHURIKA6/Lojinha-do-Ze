import { ReactNode } from 'react';

export const metadata = {
  title: 'Lojinha do Zé',
  description: 'Sua loja de produtos fitoterápicos e naturais online.',
};

export default function LojaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
