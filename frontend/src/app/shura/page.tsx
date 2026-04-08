import { notFound } from 'next/navigation';
import ShuraPageClient from '@/features/shura/ShuraPageClient';

export const metadata = {
  title: 'Shura | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShuraPage() {
  return <ShuraPageClient />;
}
