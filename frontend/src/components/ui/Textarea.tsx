interface TextareaProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Textarea({ 
  id, 
  value, 
  onChange, 
  placeholder, 
  rows = 3, 
  className = '', 
  required = false,
  disabled = false 
}: TextareaProps) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical ${className}`}
    />
  );
}
