'use client';

import { type Connector } from '@/lib/api';

interface ConnectorSelectorProps {
  connectors: Connector[];
  value: string;
  onChange: (value: string) => void;
}

export function ConnectorSelector({ connectors, value, onChange }: ConnectorSelectorProps) {
  const availableConnectors = connectors.filter((c) => c.status === 'available');

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {availableConnectors.map((connector) => (
          <option key={connector.name} value={connector.name}>
            {connector.displayName}
          </option>
        ))}
        {availableConnectors.length === 0 && (
          <option value="" disabled>
            No connectors available
          </option>
        )}
      </select>
    </div>
  );
}
