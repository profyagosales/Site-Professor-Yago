import React from 'react';

export default function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Title skeleton */}
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
      
      {/* Form fields skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      
      {/* Buttons skeleton */}
      <div className="flex justify-end space-x-3">
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
