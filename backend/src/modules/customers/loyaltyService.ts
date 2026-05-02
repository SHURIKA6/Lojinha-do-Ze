/**
 * Serviço de Fidelidade (Pontos e Cashback)
 * Gerencia o acúmulo e resgate de pontos para clientes
 */

import { Database } from '../../core/types';
import { logger } from '../../core/utils/logger';

export class LoyaltyService {
  /**
   * Configurações do programa de fidelidade
   */
  private readonly POINTS_PER_BRL = 1; // 1 ponto por cada R$ 1,00 gasto
  private readonly BRL_PER_POINT = 0.05; // Cada ponto vale R$ 0,05 (R$ 5,00 a cada 100 pontos)

  /**
   * Obtém o saldo de pontos de um usuário
   */
  async getBalance(db: any, userId: number): Promise<number> {
    try {
      const { rows } = await db.query(
        'SELECT balance FROM loyalty_points WHERE user_id = $1',
        [userId]
      );
      return rows[0]?.balance || 0;
    } catch (error) {
      logger.error('Erro ao buscar saldo de pontos', error as Error);
      return 0;
    }
  }

  /**
   * Adiciona pontos por uma compra concluída
   */
  async awardPoints(db: any, userId: number, orderId: number, amount: number): Promise<void> {
    const pointsToAward = Math.floor(amount * this.POINTS_PER_BRL);
    if (pointsToAward <= 0) return;

    try {
      // Atualiza saldo (upsert)
      await db.query(`
        INSERT INTO loyalty_points (user_id, balance)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = loyalty_points.balance + $2,
            updated_at = NOW()
      `, [userId, pointsToAward]);

      // Registra transação
      await db.query(`
        INSERT INTO loyalty_transactions (user_id, order_id, type, points, description)
        VALUES ($1, $2, 'earn', $3, $4)
      `, [userId, orderId, pointsToAward, `Compra no pedido #${orderId}`]);

      logger.info(`Pontos creditados para usuário ${userId}`, { points: pointsToAward, orderId });
    } catch (error) {
      logger.error('Erro ao creditar pontos', error as Error);
      throw error;
    }
  }

  /**
   * Resgata pontos para desconto em um pedido
   */
  async spendPoints(db: any, userId: number, orderId: number, pointsToSpend: number): Promise<number> {
    const balance = await this.getBalance(db, userId);
    if (pointsToSpend > balance) {
      throw new Error('Saldo de pontos insuficiente');
    }

    const discountValue = pointsToSpend * this.BRL_PER_POINT;

    try {
      // Deduz do saldo
      await db.query(`
        UPDATE loyalty_points 
        SET balance = balance - $1,
            updated_at = NOW()
        WHERE user_id = $2
      `, [pointsToSpend, userId]);

      // Registra transação
      await db.query(`
        INSERT INTO loyalty_transactions (user_id, order_id, type, points, description)
        VALUES ($1, $2, 'spend', $3, $4)
      `, [userId, orderId, pointsToSpend, `Desconto no pedido #${orderId}`]);

      logger.info(`Pontos resgatados pelo usuário ${userId}`, { points: pointsToSpend, discountValue, orderId });
      
      return discountValue;
    } catch (error) {
      logger.error('Erro ao resgatar pontos', error as Error);
      throw error;
    }
  }

  /**
   * Reembolsa pontos de um pedido cancelado
   */
  async refundPoints(db: any, userId: number, orderId: number, pointsToRefund: number): Promise<void> {
    if (pointsToRefund <= 0) return;

    try {
      // Atualiza saldo (upsert)
      await db.query(`
        INSERT INTO loyalty_points (user_id, balance)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = loyalty_points.balance + $2,
            updated_at = NOW()
      `, [userId, pointsToRefund]);

      // Registra transação
      await db.query(`
        INSERT INTO loyalty_transactions (user_id, order_id, type, points, description)
        VALUES ($1, $2, 'refund', $3, $4)
      `, [userId, orderId, pointsToRefund, `Reembolso de pontos do pedido #${orderId}`]);

      logger.info(`Pontos reembolsados para usuário ${userId}`, { points: pointsToRefund, orderId });
    } catch (error) {
      logger.error('Erro ao reembolsar pontos', error as Error);
      throw error;
    }
  }
}

export const loyaltyService = new LoyaltyService();
export default LoyaltyService;
