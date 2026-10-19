import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useId,
} from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  variant: 'underline' | 'pills';
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'underline' | 'pills';
  children: ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onChange,
  variant = 'underline',
  children,
  className = '',
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const baseId = useId();

  const activeTab = value !== undefined ? value : internalTab;

  const handleTabChange = (newTab: string) => {
    if (value === undefined) {
      setInternalTab(newTab);
    }
    if (onChange) {
      onChange(newTab);
    }
  };

  return (
    <TabsContext.Provider
      value={{
        activeTab,
        setActiveTab: handleTabChange,
        variant,
        baseId,
      }}
    >
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used inside Tabs');

  const containerStyles =
    context.variant === 'underline'
      ? 'flex items-center gap-6 border-b border-slate-200 overflow-x-auto scrollbar-none'
      : 'flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto';

  return (
    <div role="tablist" className={`${containerStyles} ${className}`}>
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({
  value,
  children,
  badge,
  disabled = false,
  className = '',
}: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used inside Tabs');

  const isActive = context.activeTab === value;
  const tabId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;

  const variantStyles =
    context.variant === 'underline'
      ? `pb-3 -mb-px text-sm font-semibold transition-colors duration-150 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
          isActive
            ? 'border-[#1b5040] text-[#1b5040] font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        }`
      : `px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
          isActive
            ? 'bg-white text-[#1b5040] shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      disabled={disabled}
      onClick={() => context.setActiveTab(value)}
      className={`${variantStyles} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <span>{children}</span>
      {badge && <span>{badge}</span>}
    </button>
  );
}

export function TabPanel({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used inside Tabs');

  const isActive = context.activeTab === value;
  const tabId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className={`pt-4 focus-visible:outline-none ${className}`}
    >
      {children}
    </div>
  );
}
