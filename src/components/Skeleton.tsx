import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClasses = 'skeleton';
  const variantClasses = variant === 'circle'
    ? 'rounded-full'
    : variant === 'text'
      ? 'rounded h-4'
      : 'rounded-lg';

  return <div className={`${baseClasses} ${variantClasses} ${className}`} />;
};

export const CardSkeleton: React.FC = () => (
  <div className="cyber-card p-5 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton variant="circle" className="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-16 h-3" />
      </div>
    </div>
    <Skeleton className="w-full h-12" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <tr>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-8 h-8" />
        <div className="space-y-2">
          <Skeleton variant="text" className="w-16" />
          <Skeleton variant="text" className="w-24 h-3" />
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <Skeleton variant="text" className="w-20 ml-auto" />
    </td>
    <td className="px-6 py-4">
      <Skeleton variant="text" className="w-14 ml-auto" />
    </td>
    <td className="px-6 py-4 hidden md:table-cell">
      <Skeleton variant="text" className="w-28 ml-auto" />
    </td>
    <td className="px-6 py-4 hidden lg:table-cell">
      <Skeleton className="w-24 h-12 ml-auto" />
    </td>
    <td className="px-6 py-4">
      <Skeleton variant="circle" className="w-4 h-4 mx-auto" />
    </td>
  </tr>
);

export const NewsSkeleton: React.FC = () => (
  <div className="flex gap-3">
    <Skeleton className="w-12 h-12 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-2/3 h-3" />
    </div>
  </div>
);

export const MarketNewsSkeleton: React.FC = () => (
  <div className="bg-cyber-black/40 border border-gray-800 p-3 space-y-3">
    <Skeleton variant="text" className="w-full" />
    <Skeleton variant="text" className="w-4/5" />
    <div className="flex justify-between">
      <Skeleton variant="text" className="w-16 h-3" />
      <Skeleton variant="text" className="w-20 h-3" />
    </div>
  </div>
);
