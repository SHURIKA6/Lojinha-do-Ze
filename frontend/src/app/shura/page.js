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
  if (process.env.NEXT_PUBLIC_ENABLE_EASTER_EGGS !== 'true') {
    notFound();
  }

  return <ShuraPageClient />;
}
