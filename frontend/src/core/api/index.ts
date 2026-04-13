export * from './auth';
export * from './catalog';
export * from './customers';
export * from './images';
export * from './orders';
export * from './products';
export * from './profile';
export * from './reports';
export * from './transactions';
export * from './payments';
export * from './analytics';
export * from './client';

// Re-export utilities used by pages that still expect them in the API index
export * from '../utils/formatting';
export * from '../utils/validation';
