'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Runtime Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">發生錯誤 (Application Error)</h2>
                <p className="text-gray-500 text-sm mb-6">
                    很抱歉，程式執行時發生了預期外的錯誤。
                </p>

                <div className="bg-gray-100 p-4 rounded-lg text-left overflow-auto max-h-40 mb-6 text-xs font-mono text-gray-700 break-all">
                    <p className="font-bold text-red-600 mb-1">Error Message:</p>
                    {error.message || 'Unknown Error'}
                    {error.digest && <p className="mt-2 text-gray-400">Digest: {error.digest}</p>}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                        重新整理
                    </button>
                    <button
                        onClick={() => reset()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        重試 (Try Again)
                    </button>
                </div>
            </div>
        </div>
    );
}
