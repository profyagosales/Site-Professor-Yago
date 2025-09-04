import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({
  rows = 5,
  columns = 4,
}: TableSkeletonProps) {
  return (
    <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
      {/* Header skeleton */}
      <div className='bg-gray-50 px-4 py-3 border-b border-gray-200'>
        <div className='flex space-x-4'>
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className='h-4 w-24 bg-gray-200 rounded animate-pulse'
            />
          ))}
        </div>
      </div>

      {/* Rows skeleton */}
      <div className='divide-y divide-gray-200'>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className='px-4 py-3'>
            <div className='flex space-x-4'>
              {Array.from({ length: columns }).map((_, j) => (
                <div
                  key={j}
                  className='h-4 bg-gray-200 rounded animate-pulse'
                  style={{ width: `${Math.random() * 40 + 60}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
