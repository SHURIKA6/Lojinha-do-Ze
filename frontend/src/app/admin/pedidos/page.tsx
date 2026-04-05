import OrdersManagement from '@/features/admin/OrdersManagement';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gerenciar Pedidos | Painel Administrativo',
  description: 'Gerenciamento de pedidos da Lojinha do Zé',
};

export default function PedidosPage() {
  return <OrdersManagement />;
}
