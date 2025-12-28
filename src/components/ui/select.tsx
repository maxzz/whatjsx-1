import * as React from 'react';
import { clsx } from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, ...props }, ref) => (
        <select
            ref={ref}
            className={clsx(
                'flex h-9 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
);
Select.displayName = 'Select';

export { Select };

