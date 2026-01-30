import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className,
  ...props
}, ref) => {
  // Updated colors: Charcoal primary, teal hover
  const variants = {
    primary: 'bg-secondary-700 text-white shadow-lg shadow-secondary-700/25 hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5',
    secondary: 'bg-white text-secondary-700 border-2 border-secondary-700 hover:bg-primary-400 hover:text-white hover:border-primary-400',
    outline: 'bg-transparent text-secondary-700 border-2 border-secondary-700 hover:bg-primary-400 hover:text-white hover:border-primary-400',
    ghost: 'bg-transparent text-secondary-700 hover:bg-secondary-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-green-500 text-white hover:bg-green-600',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  };

  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
        'transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
        </>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
