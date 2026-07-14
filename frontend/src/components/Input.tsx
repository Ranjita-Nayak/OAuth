import React, { InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, ...props }) => {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input 
        className={`input-field ${error ? 'border-error' : ''}`} 
        {...props} 
      />
      {error && (
        <div style={{ color: 'var(--error)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};
