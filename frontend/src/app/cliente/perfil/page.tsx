import { permanentRedirect } from 'next/navigation';

export default function ClientePerfilRedirect() {
  permanentRedirect('/conta/perfil');
}
