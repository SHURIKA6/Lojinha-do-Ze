/**
 * Componente: CpfInput
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCpfValidation } from '@/core/hooks/useCpfValidation';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

interface CpfInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  showSuggestions?: boolean;
  showStats?: boolean;
  label?: string;
  error?: string;
}

/**
 * Componente de input de CPF com validação robusta
 */
export function CpfInput({
  value = '',
  onChange,
  onBlur,
  onFocus,
  placeholder = 'Digite o CPF',
  disabled = false,
  required = false,
  showSuggestions = true,
  showStats = false,
  className = '',
  label = 'CPF',
  error: externalError,
  ...props
}: CpfInputProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    error,
    isValid,
    validateCpfRealTime,
    formatCpf,
    cleanCpf,
    getSuggestions,
    getCpfStats,
    getInputClassName,
  } = useCpfValidation();

  // Validação em tempo real
  useEffect(() => {
    if (value) {
      validateCpfRealTime(value);
    }
  }, [value, validateCpfRealTime]);

  // Atualiza sugestões quando o valor muda
  useEffect(() => {
    if (value && showSuggestions) {
      const newSuggestions = getSuggestions(value);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [value, showSuggestions, getSuggestions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleaned = cleanCpf(rawValue);

    // Limita a 11 dígitos
    if (cleaned.length <= 11) {
      const formatted = formatCpf(cleaned);
      onChange?.(formatted);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    setShowTooltip(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
    if (error || suggestions.length > 0) {
      setShowTooltip(true);
    }
  };

  const handleMouseEnter = () => {
    if (error || suggestions.length > 0) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const displayError = externalError || error;
  const inputClassName = getInputClassName(`cpf-input ${className}`);
  const stats = showStats ? getCpfStats(value) : null;

  return (
    <div className="cpf-input-container">
      {label && (
        <label className="cpf-input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      <div className="cpf-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          maxLength={14} // XXX.XXX.XXX-XX
          autoComplete="off"
          {...props}
        />

        {/* Ícone de status */}
        <div className="cpf-input-icon">
          {displayError ? (
            <FiAlertCircle className="error-icon" />
          ) : isValid ? (
            <FiCheckCircle className="success-icon" />
          ) : null}
        </div>

        {/* Tooltip com sugestões */}
        {showTooltip && (displayError || suggestions.length > 0) && (
          <div className="cpf-input-tooltip">
            {displayError && (
              <div className="cpf-tooltip-error">
                <FiAlertCircle />
                <span>{displayError}</span>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="cpf-tooltip-suggestions">
                <FiInfo />
                <div>
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="suggestion-item">
                      • {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estatísticas do CPF */}
      {showStats && stats && (
        <div className="cpf-input-stats">
          <div className="stat-item">
            <span className="stat-label">Formatado:</span>
            <span className="stat-value">{stats.formatted || '-'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Válido:</span>
            <span className={`stat-value ${stats.isValid ? 'valid' : 'invalid'}`}>
              {stats.isValid ? 'Sim' : 'Não'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Região:</span>
            <span className="stat-value">{stats.region}</span>
          </div>
        </div>
      )}

      {/* Dicas de uso */}
      <div className="cpf-input-hints">
        <div className="hint-item">
          <FiInfo />
          <span>Digite apenas números ou use o formato XXX.XXX.XXX-XX</span>
        </div>
        {value && !isValid && !displayError && (
          <div className="hint-item warning">
            <FiAlertCircle />
            <span>CPF incompleto - continue digitando</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface CpfDisplayProps {
  cpf: string;
  showFormatted?: boolean;
  showStats?: boolean;
}

/**
 * Componente de CPF somente leitura
 */
export function CpfDisplay({ cpf, showFormatted = true, showStats = false }: CpfDisplayProps) {
  const { formatCpf, getCpfStats, validateCpf } = useCpfValidation();

  const formatted = showFormatted ? formatCpf(cpf) : cpf;
  const stats = showStats ? getCpfStats(cpf) : null;
  const validation = validateCpf(cpf);

  return (
    <div className="cpf-display">
      <span className={`cpf-value ${validation.valid ? 'valid' : 'invalid'}`}>
        {formatted}
      </span>

      {showStats && stats && (
        <div className="cpf-display-stats">
          <span className={`status-badge ${validation.valid ? 'valid' : 'invalid'}`}>
            {validation.valid ? '✓ Válido' : '✗ Inválido'}
          </span>
          <span className="region-badge">{stats.region}</span>
        </div>
      )}
    </div>
  );
}

interface CpfValidatorProps {
  cpf: string;
  onValidationChange?: (result: { isValid: boolean; error: string | null }) => void;
}

/**
 * Componente de validação de CPF em tempo real
 */
export function CpfValidator({ cpf, onValidationChange }: CpfValidatorProps) {
  const { validateCpfRealTime, error, isValid } = useCpfValidation();

  useEffect(() => {
    if (cpf) {
      validateCpfRealTime(cpf);
    }
  }, [cpf, validateCpfRealTime]);

  useEffect(() => {
    onValidationChange?.({ isValid, error });
  }, [isValid, error, onValidationChange]);

  if (!cpf) return null;

  return (
    <div className="cpf-validator">
      {error ? (
        <div className="validation-error">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      ) : isValid ? (
        <div className="validation-success">
          <FiCheckCircle />
          <span>CPF válido</span>
        </div>
      ) : (
        <div className="validation-pending">
          <FiInfo />
          <span>Validando CPF...</span>
        </div>
      )}
    </div>
  );
}
