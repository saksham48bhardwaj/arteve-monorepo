import * as React from 'react';
import { cn } from './cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, errorText, leadingIcon, trailingIcon, className, id, ...rest }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">
              {leadingIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'input',
              leadingIcon && 'pl-10',
              trailingIcon && 'pr-10',
              errorText && '!border-danger',
              className,
            )}
            {...rest}
          />
          {trailingIcon && (
            <span className="absolute inset-y-0 right-3 flex items-center text-ink-subtle">
              {trailingIcon}
            </span>
          )}
        </div>
        {errorText ? <p className="error">{errorText}</p> : helper ? <p className="helper">{helper}</p> : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  errorText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helper, errorText, className, id, ...rest }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn('textarea', errorText && '!border-danger', className)}
          {...rest}
        />
        {errorText ? <p className="error">{errorText}</p> : helper ? <p className="helper">{helper}</p> : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  errorText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helper, errorText, className, id, children, ...rest }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn('select pr-9', errorText && '!border-danger', className)}
          {...rest}
        >
          {children}
        </select>
        {errorText ? <p className="error">{errorText}</p> : helper ? <p className="helper">{helper}</p> : null}
      </div>
    );
  },
);
Select.displayName = 'Select';
