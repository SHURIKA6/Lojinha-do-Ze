import { NextResponse } from 'next/server';

export async function GET() {
  const flag = `🎉 Parabéns! Você encontrou a flag!

Mas calma... esta não é uma competição de CTF! 😄

Você é oficialmente um hacker curioso. Mas se você realmente
quisesse hackear algo, teria que:

1. Encontrar uma vulnerabilidade real (boa sorte!)
2. Explorar endpoints que não existem
3. Tentar SQL injection (não vai funcionar aqui)
4. Brute force (vai demorar muito...)
5. Esperar alguém postar a senha no Reddit

Na verdade, você acabou de descobrir que este site é
um easter egg para pessoas curiosas como você!

🏆 Achievement Unlocked: "Curioso Profissional"

Dica real: O melhor "hack" é comprar na Lojinha do Zé! 🛒
www.lojinha-do-ze.vercel.app

# CTF{this_is_not_a_real_flag_but_you_are_really_curious}

P.S.: Não há vulnerabilidades aqui. Apenas diversão! 😂`;

  return new NextResponse(flag, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
