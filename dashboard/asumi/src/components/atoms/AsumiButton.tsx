import type { ButtonHTMLAttributes, ReactNode } from 'react';

type AsumiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	children: ReactNode;
};

export function AsumiButton({ children, className = '', ...props }: AsumiButtonProps) {
	return (
		<button className={`asumi-button ${className}`.trim()} type="button" {...props}>
			{children}
		</button>
	);
}
