/**
 * Placeholder for authenticated user menu.
 * Replace internals once auth provider is wired up.
 */
export function UserMenu() {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
        TS
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          Antellion
        </p>
        <p className="truncate text-xs text-gray-500">Demo workspace</p>
      </div>
    </div>
  );
}
