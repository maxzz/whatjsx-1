import * as React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
    <input
        type={type}
        className={clsx(
            'flex h-9 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50',
            className
        )}
        ref={ref}
        {...props}
    />
));
Input.displayName = 'Input';

export { Input };

