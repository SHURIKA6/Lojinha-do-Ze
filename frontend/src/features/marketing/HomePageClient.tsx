'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/services/auth/AuthContext';
import {
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiGrid,
  FiMapPin,
  FiShoppingBag,
  FiShield,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import { IconType } from 'react-icons';

interface Feature {
  icon: IconType;
  title: string;
  text: string;
}

const features: Feature[] = [
  {
    icon: FiCheckCircle,
    title: 'Curadoria natural',
    text: 'Uma vitrine com linguagem mais premium para produtos fitoterápicos, naturais e de rotina.',
  },
  {
    icon: FiTruck,
    title: 'Entrega local e retirada',
    text: 'Compra simples com entrega rápida na região ou retirada no balcão sem atrito.',
  },
  {
    icon: FiShield,
    title: 'Experiência confiável',
    text: 'Fluxo claro de pedido, pagamento e gestão para cliente e operação.',
  },
];

interface Category {
  tag: string;
  title: string;
  text: string;
}

const categories: Category[] = [
  {
    tag: 'Tinturas',
    title: 'Concentração e praticidade',
    text: 'Catálogo preparado para destacar linhas de uso recorrente e explicar o benefício com clareza.',
  },
  {
    tag: 'Cápsulas',
    title: 'Rotina com valor percebido',
    text: 'Cards mais fortes visualmente ajudam a vender qualidade e consistência, não só preço.',
  },
  {
    tag: 'Chás e cuidados',
    title: 'Tom acolhedor de loja especialista',
    text: 'A apresentação traz proximidade sem perder acabamento profissional.',
  },
];

const storyPoints: string[] = [
  'Identidade visual natural premium com monograma LZ temporário.',
  'Home comercial, vitrine separada em /loja e portais autenticados consistentes.',
  'Admin mais sóbrio para operação, sem perder ligação com a marca.',
];

export default function HomePageClient() {
  const { user, isAdmin } = useAuth();

  const portalHref = isAdmin ? '/admin/dashboard' : user ? '/conta' : '/login';
  const portalLabel = isAdmin ? 'Abrir Painel' : user ? 'Minha Conta' : 'Login';
  const PortalIcon = isAdmin ? FiGrid : user ? FiUser : FiArrowRight;

  return (
    <div className="landing-page">
      <div className="landing-shell animate-fadeIn">
        <header className="landing-topbar">
          <div className="landing-topbar__brand">
            <div className="brand-mark">LZ</div>
            <div className="brand-copy">
              <div className="brand-copy__name">Lojinha do Zé</div>
              <div className="brand-copy__sub">Produtos fitoterápicos e naturais</div>
            </div>
          </div>

          <div className="landing-topbar__actions">
            <Link className="btn btn--secondary" href="/loja">
              <FiShoppingBag />
              Ver Loja
            </Link>
            <Link className="btn btn--primary" href={portalHref}>
              <PortalIcon />
              {portalLabel}
            </Link>
          </div>
        </header>

        <main>
          <section className="landing-hero">
            <div className="landing-hero__content">
              <span className="landing-eyebrow">
                <FiCheckCircle />
                Natural premium
              </span>

              <h1 className="landing-hero__title">Produtos naturais com cara de marca séria.</h1>

              <p className="landing-hero__copy">
                A Lojinha do Zé agora apresenta catálogo, atendimento e gestão em uma experiência mais
                profissional, clara e pronta para converter melhor no digital.
              </p>

              <div className="landing-hero__actions">
                <Link className="btn btn--primary btn--lg" href="/loja">
                  <FiShoppingBag />
                  Comprar agora
                </Link>
                <Link className="btn btn--secondary btn--lg" href={portalHref}>
                  <PortalIcon />
                  {portalLabel}
                </Link>
              </div>

              <div className="landing-hero__trust">
                <span className="landing-pill">
                  <FiTruck />
                  Entrega local
                </span>
                <span className="landing-pill">
                  <FiMapPin />
                  Retirada rápida
                </span>
                <span className="landing-pill">
                  <FiCreditCard />
                  PIX ou maquininha
                </span>
              </div>
            </div>

            <div className="landing-hero__visual">
              <div className="landing-visual-card landing-visual-card--primary">
                <h3>Vitrine comercial, não catálogo improvisado.</h3>
                <p>
                  A nova apresentação prioriza confiança, leitura rápida e decisão de compra em poucos
                  toques.
                </p>

                <div className="landing-visual-stats">
                  <div className="landing-visual-stat">
                    <strong>/loja</strong>
                    <span>Compra direta</span>
                  </div>
                  <div className="landing-visual-stat">
                    <strong>/conta</strong>
                    <span>Acompanhamento</span>
                  </div>
                  <div className="landing-visual-stat">
                    <strong>/admin</strong>
                    <span>Operação</span>
                  </div>
                </div>
              </div>

              <div className="landing-visual-card">
                <h3>Tom certo para o negócio</h3>
                <p>
                  Visual acolhedor para cliente final e linguagem mais contida para gestão, ambos na
                  mesma identidade.
                </p>
              </div>
            </div>
          </section>

          <section className="landing-grid landing-grid--triple">
            {(features).map(({ icon: Icon, title, text }) => (
              <article key={title} className="landing-feature">
                <div className="landing-feature__icon">
                  <Icon />
                </div>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </section>

          <section className="landing-grid landing-grid--triple">
            {(categories).map((category) => (
              <article key={category.title} className="landing-category">
                <span className="landing-category__tag">{category.tag}</span>
                <h2>{category.title}</h2>
                <p>{category.text}</p>
              </article>
            ))}
          </section>

          <section className="landing-story">
            <div className="landing-story__content">
              <span className="landing-eyebrow">
                <FiCheckCircle />
                Estrutura reposicionada
              </span>
              <h2>Uma base visual para vender melhor hoje e crescer sem parecer amador amanhã.</h2>
              <p>
                A home comercial apresenta a marca, a loja continua transacional em <strong>/loja</strong>{' '}
                e os ambientes autenticados passam a conversar entre si com mais clareza.
              </p>
            </div>

            <div className="landing-story__list">
              {(storyPoints).map((point) => (
                <div key={point} className="landing-story__item">
                  <span>
                    <FiCheckCircle />
                  </span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="landing-cta-panel">
            <div>
              <h2>Quer comprar, acompanhar pedidos ou entrar na operação?</h2>
              <p>Os três caminhos agora estão claros desde a primeira tela.</p>
            </div>

            <div className="landing-topbar__actions">
              <Link className="btn btn--secondary" href="/loja">
                <FiShoppingBag />
                Ir para a loja
              </Link>
              <Link className="btn btn--primary" href={portalHref}>
                <PortalIcon />
                {portalLabel}
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
