export default function LoadingSpinner({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
