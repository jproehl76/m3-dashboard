import React from 'react';

interface PressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
  /** Override element — defaults to div */
  as?: 'div' | 'button' | 'li';
}

/**
 * iOS-native press feedback. Scale + opacity on active press, min 44pt tap target.
 * Use instead of bare <button> or <div onClick> for anything interactive on mobile.
 */
export function Pressable({
  children,
  onPress,
  className = '',
  disabled = false,
  as: Tag = 'div',
}: PressableProps) {
  return (
    <Tag
      role={Tag === 'div' || Tag === 'li' ? 'button' : undefined}
      tabIndex={disabled ? -1 : 0}
      className={[
        'cursor-pointer select-none',
        'transition-transform duration-100 ease-out',
        'active:scale-[0.97] active:opacity-75',
        'min-h-[44px] flex items-center',
        disabled ? 'pointer-events-none opacity-40' : '',
        className,
      ].join(' ')}
      onClick={disabled ? undefined : onPress}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onPress?.();
        }
      }}
    >
      {children}
    </Tag>
  );
}
