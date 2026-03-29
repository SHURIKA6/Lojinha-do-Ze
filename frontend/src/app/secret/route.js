import { NextResponse } from 'next/server';

export async function GET() {
  const secret = `🔒 SECRETO ABSOLUTO - NÃO COMPARTILHE! 🔒

Você encontrou o segredo mais secreto da Lojinha do Zé!

Mas calma... este segredo não é tão secreto assim! 😄

O verdadeiro segredo é:
- A Lojinha do Zé tem os melhores produtos!
- Os preços são imbatíveis!
- O atendimento é incrível!
- E você é oficialmente um hacker curioso!

🏆 Achievement Unlocked: 'Caçador de Segredos'

Agora que você encontrou o segredo, o que você vai fazer?

Opção 1: Compartilhar com todo mundo (não recomendado)
Opção 2: Guardar para si (recomendado)
Opção 3: Comprar na Lojinha do Zé (MUITO recomendado!)

www.lojinha-do-ze.vercel.app

P.S.: Não há nada de especial aqui. Apenas uma mensagem para hackers curiosos! 😂`;

  return new NextResponse(secret, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}