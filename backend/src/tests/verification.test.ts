import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Use unstable_mockModule for ESM
jest.unstable_mockModule('../modules/orders/repository', () => ({
  __esModule: true,
  findOrderByIdForUpdate: jest.fn(),
  transactionExists: jest.fn(),
  createTransaction: jest.fn(),
  logOrderStatusHistory: jest.fn(),
  restoreProductStockBulk: jest.fn(),
  updateOrderStatus: jest.fn(),
}));

jest.unstable_mockModule('../modules/customers/loyaltyService', () => ({
  __esModule: true,
  loyaltyService: {
    awardPoints: jest.fn(),
    refundPoints: jest.fn(),
  }
}));

jest.unstable_mockModule('../modules/notifications/whatsapp', () => ({
  __esModule: true,
  sendWhatsAppMessage: jest.fn(),
}));

jest.unstable_mockModule('../modules/notifications/notifier', () => ({
  __esModule: true,
  broadcastNotification: jest.fn(),
}));

jest.unstable_mockModule('../core/utils/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

// Dynamic imports are required for mocked modules in ESM
const orderRepository = await import('../modules/orders/repository') as any;
const { updateOrderStatus } = await import('../modules/orders/service');

describe('Order Status Update Verification', () => {
  let mockDb: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn<any>().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockDb = {
      connect: jest.fn<any>().mockResolvedValue(mockClient),
    };
  });

  it('should prevent double transactions when moving to concluído', async () => {
    const orderId = '123';
    const mockOrder = {
      id: orderId,
      status: 'pago',
      customer_id: '1',
      customer_name: 'Test',
      total: 100,
      subtotal: 90,
      items: JSON.stringify([{ productId: '1', quantity: 1, name: 'Item 1' }]),
    };

    orderRepository.findOrderByIdForUpdate.mockResolvedValue(mockOrder);
    orderRepository.transactionExists.mockResolvedValue(true); 

    await updateOrderStatus(mockDb, orderId, 'concluido', {}, {});

    expect(orderRepository.createTransaction).not.toHaveBeenCalled();
    expect(orderRepository.logOrderStatusHistory).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('should create transaction if it does not exist when moving to concluído', async () => {
    const orderId = '124';
    const mockOrder = {
      id: orderId,
      status: 'pago',
      customer_id: '1',
      customer_name: 'Test',
      total: 100,
      subtotal: 90,
      items: JSON.stringify([{ productId: '1', quantity: 1, name: 'Item 1' }]),
    };

    orderRepository.findOrderByIdForUpdate.mockResolvedValue(mockOrder);
    orderRepository.transactionExists.mockResolvedValue(false);

    await updateOrderStatus(mockDb, orderId, 'concluido', {}, {});

    expect(orderRepository.createTransaction).toHaveBeenCalledWith(mockClient, expect.objectContaining({
      orderId: orderId,
      value: 100
    }));
  });

  it('should restore stock when cancelling a pending order', async () => {
    const orderId = '125';
    const mockOrder = {
      id: orderId,
      status: 'pendente',
      items: JSON.stringify([{ productId: '1', quantity: 2, name: 'Item 1' }]),
    };

    orderRepository.findOrderByIdForUpdate.mockResolvedValue(mockOrder);

    await updateOrderStatus(mockDb, orderId, 'cancelado', {}, {});

    expect(orderRepository.restoreProductStockBulk).toHaveBeenCalledWith(
      mockClient,
      [1],
      [2],
      ['Item 1'],
      expect.stringContaining('125')
    );
  });
});
