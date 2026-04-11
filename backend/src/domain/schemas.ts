import { z } from 'zod';
import {
  DELIVERY_TYPE_VALUES,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PRODUCT_CATEGORY_VALUES,
} from './constants';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function optionalTrimmedString(max: number, label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `${label} deve ter no máximo ${max} caracteres`).optional()
  );
}

const nonNegativeInt = (label: string) =>
  z.coerce
    .number()
    .int(`${label} deve ser inteiro`)
    .min(0, `${label} não pode ser negativo`)
    .max(999999, `${label} excede o limite permitido`);

const nonNegativeMoney = (label: string) =>
  z.coerce
    .number()
    .min(0, `${label} não pode ser negativo`)
    .max(999999.99, `${label} excede o limite permitido`);

export const loginSchema = z
  .object({
    identifier: optionalTrimmedString(255, 'Identificador'),
    email: optionalTrimmedString(255, 'E-mail'),
    password: z
      .string()
      .min(1, 'Senha é obrigatória')
      .max(128, 'Senha excede o limite permitido'),
  })
  .superRefine((data, ctx) => {
    if (!data.identifier && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'E-mail ou telefone é obrigatório',
        path: ['identifier'],
      });
    }
  });

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Senha atual é obrigatória')
    .max(128, 'Senha atual excede o limite permitido'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(128, 'Nova senha excede o limite permitido')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula e 1 número'
    ),
});

export const passwordSetupSchema = z
  .object({
    token: optionalTrimmedString(128, 'Token'),
    code: optionalTrimmedString(16, 'Código'),
    password: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .max(128, 'Senha excede o limite permitido')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula e 1 número'
      ),
    confirmPassword: z
      .string()
      .min(8, 'Confirmação de senha deve ter pelo menos 8 caracteres')
      .max(128, 'Confirmação de senha excede o limite permitido'),
  })
  .superRefine((data, ctx) => {
    if (!data.token && !data.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o token ou código do convite',
        path: ['token'],
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
      });
    }
  });

const customerBaseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome é obrigatório')
      .max(120, 'Nome deve ter no máximo 120 caracteres'),
    email: z.preprocess(
      emptyToUndefined,
      z.string().trim().email('E-mail inválido').max(255, 'E-mail muito longo').optional()
    ),
    phone: optionalTrimmedString(30, 'Telefone'),
    cpf: optionalTrimmedString(20, 'CPF'),
    address: optionalTrimmedString(320, 'Endereço'),
    notes: optionalTrimmedString(800, 'Observações'),
  });

export const customerCreateSchema = customerBaseSchema
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um e-mail ou telefone para acesso',
        path: ['phone'],
      });
    }
  });

export const customerUpdateSchema = customerBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const productCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Código do produto é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres'),
  name: z
    .string()
    .trim()
    .min(3, 'Nome do produto deve ter no mínimo 3 caracteres')
    .max(140, 'Nome do produto deve ter no máximo 140 caracteres'),
  description: optionalTrimmedString(800, 'Descrição'),
  photo: optionalTrimmedString(500, 'Foto'),
  category: z
    .enum(PRODUCT_CATEGORY_VALUES as unknown as [string, ...string[]], { error: 'Categoria inválida' })
    .default('Outros'),
  quantity: nonNegativeInt('Quantidade').default(0),
  min_stock: nonNegativeInt('Estoque mínimo').default(5),
  cost_price: nonNegativeMoney('Preço de custo').default(0),
  sale_price: nonNegativeMoney('Preço de venda').default(0),
  supplier: optionalTrimmedString(140, 'Fornecedor'),
  is_active: z.boolean().default(true),
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const profileUpdateSchema = z
  .object({
    name: optionalTrimmedString(120, 'Nome'),
    email: z.preprocess(
      emptyToUndefined,
      z.string().trim().email('E-mail inválido').max(255, 'E-mail muito longo').optional()
    ),
    phone: optionalTrimmedString(30, 'Telefone'),
    address: optionalTrimmedString(320, 'Endereço'),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const transactionCreateSchema = z.object({
  type: z.enum(['receita', 'despesa']),
  category: z
    .string()
    .trim()
    .min(2, 'Categoria é obrigatória')
    .max(100, 'Categoria deve ter no máximo 100 caracteres'),
  description: optionalTrimmedString(800, 'Descrição'),
  value: z.coerce
    .number()
    .positive('Valor deve ser positivo')
    .max(999999.99, 'Valor excede o limite permitido'),
  date: optionalTrimmedString(50, 'Data'),
});

export const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive('ID de produto inválido'),
  quantity: z.coerce.number().int().positive('Quantidade deve ser maior que zero'),
});

export const orderCreateSchema = z
  .object({
    customer_name: z
      .string()
      .trim()
      .min(2, 'Nome é obrigatório')
      .max(120, 'Nome deve ter no máximo 120 caracteres'),
    customer_phone: z
      .string()
      .trim()
      .min(8, 'Telefone inválido')
      .max(30, 'Telefone deve ter no máximo 30 caracteres'),
    notes: optionalTrimmedString(800, 'Observações'),
    delivery_type: z.enum(DELIVERY_TYPE_VALUES).default('entrega'),
    address: optionalTrimmedString(320, 'Endereço'),
    payment_method: z.enum(PAYMENT_METHOD_VALUES).default('pix'),
    items: z.array(orderItemSchema).min(1, 'Pedido deve conter ao menos 1 item'),
  })
  .superRefine((data, ctx) => {
    if (data.delivery_type === 'entrega' && !data.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Endereço de entrega é obrigatório',
        path: ['address'],
      });
    }
  });

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
});

export const pixPaymentSchema = z.object({
  orderId: z.coerce.number().int('ID de pedido inválido'),
  email: z.string().email('E-mail inválido'),
  phone: z
    .string()
    .trim()
    .min(10, 'Telefone inválido')
    .max(30, 'Telefone deve ter no máximo 30 caracteres'),
  firstName: z.string().min(2, 'Nome é muito curto'),
  lastName: z.string().min(2, 'Sobrenome é muito curto'),
  identificationNumber: z.string().min(11, 'CPF/CNPJ inválido'),
});
