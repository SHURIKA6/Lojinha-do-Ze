import AdminLayoutClient from '@/features/admin/AdminLayoutClient';

export const metadata = {
  title: 'Admin | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
