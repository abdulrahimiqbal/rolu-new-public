"use client";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function Card({
  title,
  children,
  actions,
  className = "",
}: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={title ? "p-6" : "p-6"}>{children}</div>
    </div>
  );
}
