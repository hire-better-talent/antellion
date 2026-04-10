interface FormTextareaProps {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  error?: string;
}

export function FormTextarea({
  label,
  name,
  placeholder,
  defaultValue,
  rows = 3,
  error,
}: FormTextareaProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:border-brand-500 focus:ring-brand-500"
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
