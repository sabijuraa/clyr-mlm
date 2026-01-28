import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/helpers';

const Input = forwardRef(({
  label,
  error,
  hint,
  icon: Icon,
  type = 'text',
  required = false,
  className,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          ref={ref}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            'w-full px-4 py-3 text-gray-800 bg-white border-2 rounded-xl',
            'transition-all duration-200',
            'focus:outline-none focus:ring-4',
            'placeholder:text-gray-400',
            Icon && 'pl-12',
            isPassword && 'pr-12',
            error 
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100' 
              : 'border-gray-200 focus:border-teal-500 focus:ring-teal-100',
            className
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
      
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;