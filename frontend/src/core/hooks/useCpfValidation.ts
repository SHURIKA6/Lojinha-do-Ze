/**
 * Hook: useCpfValidation
 */

'use client';

import { useState, useCallback, useMemo } from 'react';

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

interface CpfStats {
  length: number;
  formatted: string;
  isValid: boolean;
  hasRepeatedDigits: boolean;
  region: string;
}

interface UseCpfValidationReturn {
  error: string;
  isValid: boolean;
  validateCpf: (cpf: string) => ValidationResult;
  validateCpfRealTime: (cpf: string) => boolean;
  validateCpfDebounced: (cpf: string, delay?: number) => () => void;
  cleanCpf: (cpf: string) => string;
  formatCpf: (cpf: string) => string;
  getSuggestions: (cpf: string) => string[];
  getCpfStats: (cpf: string) => CpfStats;
  clearValidation: () => void;
  getInputClassName: (baseClass?: string) => string;
}

/**
 * Hook personalizado para validação robusta de CPF
 * Inclui validação de dígitos verificadores, formatação e feedback
 */
export function useCpfValidation(): UseCpfValidationReturn {
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  /**
   * Remove caracteres não numéricos
   */
  const cleanCpf = useCallback((cpf: string): string => {
    return cpf.replace(/\D/g, '');
  }, []);

  /**
   * Formata CPF com máscara
   */
  const formatCpf = useCallback((cpf: string): string => {
    const cleaned = cleanCpf(cpf);
    if (cleaned.length !== 11) return cleaned;
    
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }, [cleanCpf]);

  /**
   * Valida CPF usando algoritmo oficial
   */
  const validateCpf = useCallback((cpf: string): ValidationResult => {
    const cleaned = cleanCpf(cpf);
    
    // Verifica se tem 11 dígitos
    if (cleaned.length !== 11) {
      return { valid: false, error: 'CPF deve ter 11 dígitos' };
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleaned)) {
      return { valid: false, error: 'CPF inválido' };
    }

    // Valida primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) {
      return { valid: false, error: 'CPF inválido' };
    }

    // Valida segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[10])) {
      return { valid: false, error: 'CPF inválido' };
    }

    return { valid: true, error: null };
  }, [cleanCpf]);

  /**
   * Valida CPF em tempo real
   */
  const validateCpfRealTime = useCallback((cpf: string): boolean => {
    const cleaned = cleanCpf(cpf);
    
    if (cleaned.length === 0) {
      setError('');
      setIsValid(false);
      return true;
    }

    if (cleaned.length < 11) {
      setError('CPF incompleto');
      setIsValid(false);
      return false;
    }

    const validation = validateCpf(cpf);
    setError(validation.error || '');
    setIsValid(validation.valid);
    return validation.valid;
  }, [cleanCpf, validateCpf]);

  /**
   * Valida CPF com debounce
   */
  const validateCpfDebounced = useCallback((cpf: string, delay = 300): (() => void) => {
    const timeoutId = setTimeout(() => {
      validateCpfRealTime(cpf);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [validateCpfRealTime]);

  /**
   * Retorna sugestões de correção
   */
  const getSuggestions = useCallback((cpf: string): string[] => {
    const cleaned = cleanCpf(cpf);
    const suggestions: string[] = [];

    if (cleaned.length < 11) {
      suggestions.push('CPF deve ter 11 dígitos');
    }

    if (/^(\d)\1+$/.test(cleaned)) {
      suggestions.push('CPF não pode ter todos os dígitos iguais');
    }

    if (cleaned.length === 11) {
      const validation = validateCpf(cpf);
      if (!validation.valid) {
        suggestions.push('Verifique os dígitos verificadores');
      }
    }

    return suggestions;
  }, [cleanCpf, validateCpf]);

  /**
   * Identifica região do CPF
   */
  const getRegion = useCallback((cpf: string): string => {
    if (cpf.length < 9) return 'Desconhecida';
    
    const regionCode = parseInt(cpf[8]);
    const regions: Record<number, string> = {
      0: 'Rio Grande do Sul',
      1: 'Distrito Federal, Goiás, Mato Grosso, Mato Grosso do Sul e Tocantins',
      2: 'Amazonas, Pará, Roraima, Amapá, Acre e Rondônia',
      3: 'Ceará, Maranhão e Piauí',
      4: 'Pernambuco, Rio Grande do Norte, Alagoas e Paraíba',
      5: 'Bahia e Sergipe',
      6: 'Minas Gerais',
      7: 'Rio de Janeiro e Espírito Santo',
      8: 'São Paulo',
      9: 'Paraná e Santa Catarina',
    };

    return regions[regionCode] || 'Desconhecida';
  }, []);

  /**
   * Retorna estatísticas do CPF
   */
  const getCpfStats = useCallback((cpf: string): CpfStats => {
    const cleaned = cleanCpf(cpf);
    
    return {
      length: cleaned.length,
      formatted: formatCpf(cpf),
      isValid: validateCpf(cpf).valid,
      hasRepeatedDigits: /^(\d)\1+$/.test(cleaned),
      region: getRegion(cleaned),
    };
  }, [cleanCpf, formatCpf, validateCpf, getRegion]);

  /**
   * Limpa estado de validação
   */
  const clearValidation = useCallback(() => {
    setError('');
    setIsValid(false);
  }, []);

  /**
   * Retorna classes CSS baseadas no estado
   */
  const getInputClassName = useCallback((baseClass = ''): string => {
    const classes = [baseClass];
    
    if (error) classes.push('error');
    if (isValid) classes.push('valid');
    
    return classes.filter(Boolean).join(' ');
  }, [error, isValid]);

  return {
    // Estado
    error,
    isValid,
    
    // Funções de validação
    validateCpf,
    validateCpfRealTime,
    validateCpfDebounced,
    
    // Funções de formatação
    cleanCpf,
    formatCpf,
    
    // Funções auxiliares
    getSuggestions,
    getCpfStats,
    clearValidation,
    getInputClassName,
  };
}

interface UseCpfFieldReturn {
  value: string;
  error: string;
  isValid: boolean;
  touched: boolean;
  dirty: boolean;
  handleChange: (newValue: string) => void;
  handleBlur: () => void;
  handleFocus: () => void;
  reset: () => void;
  formatCpf: (cpf: string) => string;
  cleanCpf: (cpf: string) => string;
  getInputClassName: (baseClass?: string) => string;
}

/**
 * Hook para validação de CPF em formulários
 */
export function useCpfField(initialValue = ''): UseCpfFieldReturn {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  
  const {
    error,
    isValid,
    validateCpfRealTime,
    formatCpf,
    cleanCpf,
    clearValidation,
    getInputClassName,
  } = useCpfValidation();

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setDirty(true);
    
    if (touched) {
      validateCpfRealTime(newValue);
    }
  }, [touched, validateCpfRealTime]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validateCpfRealTime(value);
  }, [value, validateCpfRealTime]);

  const handleFocus = useCallback(() => {
    if (error) {
      clearValidation();
    }
  }, [error, clearValidation]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setTouched(false);
    setDirty(false);
    clearValidation();
  }, [initialValue, clearValidation]);

  return {
    value,
    error,
    isValid,
    touched,
    dirty,
    handleChange,
    handleBlur,
    handleFocus,
    reset,
    formatCpf,
    cleanCpf,
    getInputClassName,
  };
}