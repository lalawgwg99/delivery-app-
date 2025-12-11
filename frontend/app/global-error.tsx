'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Critical System Error</h2>
                    <p className="text-gray-600 mb-6">Something went wrong (Global Context).</p>
                    <div className="bg-gray-100 p-4 rounded-lg text-left overflow-auto max-h-60 mb-6 text-sm font-mono text-gray-800 w-full max-w-lg">
                        {error.message}
                    </div>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
