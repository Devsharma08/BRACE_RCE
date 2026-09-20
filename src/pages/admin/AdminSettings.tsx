import { useState } from 'react';
import { useAdminSettings, useUpdateSetting } from '../../hooks/useAdmin';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'text' | 'boolean' | 'json';
  default: any;
}

const settingFields: SettingField[] = [
  { key: 'maxBattlePlayers', label: 'Max Battle Players', description: 'Maximum participants per battle room', type: 'number', default: 2 },
  { key: 'defaultTimeLimitMs', label: 'Default Time Limit', description: 'Default battle duration in milliseconds', type: 'number', default: 300000 },
  { key: 'pistonTimeoutMs', label: 'Piston Timeout', description: 'Docker sandbox execution timeout (ms)', type: 'number', default: 5000 },
  { key: 'maxCodeLength', label: 'Max Code Length', description: 'Maximum allowed code submission length', type: 'number', default: 10000 },
  { key: 'dailySubmissionsLimit', label: 'Daily Submission Limit', description: 'Maximum submissions per user per day', type: 'number', default: 50 },
  { key: 'allowCustomBattles', label: 'Custom Battles', description: 'Allow users to create custom battle rooms', type: 'boolean', default: true },
  { key: 'requireAuthForPractice', label: 'Auth for Practice', description: 'Require authentication to access practice terminal', type: 'boolean', default: false },
];

const AdminSettings = () => {
  const { data: settings, isLoading, refetch } = useAdminSettings();
  const updateSetting = useUpdateSetting();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const currentValue = (key: string) => {
    if (!settings) return settingFields.find((f) => f.key === key)?.default;
    return settings[key] ?? settingFields.find((f) => f.key === key)?.default;
  };

  const handleSave = async (field: SettingField) => {
    setSavingKey(field.key);
    try {
      await updateSetting.mutateAsync({ key: field.key, value: currentValue(field.key) });
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save setting');
    } finally {
      setSavingKey(null);
    }
  };

  const renderValue = (field: SettingField) => {
    const val = currentValue(field.key);
    if (field.type === 'boolean') {
      return (
        <select
          value={String(val)}
          onChange={(e) => {
            const boolVal = e.target.value === 'true';
            const event = new CustomEvent('settings-update', { detail: { key: field.key, value: boolVal } });
            window.dispatchEvent(event);
          }}
          className="px-2 py-1 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary font-bold"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }
    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={val ?? ''}
        onChange={(e) => {
          const newValue = field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
          const ev = new CustomEvent('settings-update', { detail: { key: field.key, value: newValue } });
          window.dispatchEvent(ev);
        }}
        className="w-full px-2 py-1 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary font-mono"
      />
    );
  };

  // Listen for inline value changes via a lightweight state relay
  const [, forceUpdate] = useState(0);
  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  const getLocalOrStored = (field: SettingField) => {
    if (localValues.hasOwnProperty(field.key)) return localValues[field.key];
    return currentValue(field.key);
  };

  const setLocal = (key: string, value: any) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4">
          <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">
            APPLICATION SETTINGS
          </h1>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-subtle-line hover:border-accent-primary text-subtle hover:text-accent-primary font-bold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> REFRESH
          </button>
        </div>

        {/* Settings Grid */}
        <div className="rounded-none border border-accent-primary/15 border-t-2 border-t-accent-primary/40 bg-raised overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="p-4 border-b border-subtle-line text-xs font-bold text-faint tracking-widest uppercase relative z-10">
            GLOBAL CONFIGURATION
          </div>

          <div className="p-6 space-y-6 relative z-10">
            {settingFields.map((field) => (
              <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <span className="text-sm font-bold text-fg">{field.label}</span>
                  <p className="text-xs text-faint mt-0.5">{field.description}</p>
                </div>
                <div className="md:col-span-1">
                  {field.type === 'boolean' ? (
                    <select
                      value={String(getLocalOrStored(field))}
                      onChange={(e) => setLocal(field.key, e.target.value === 'true')}
                      className="w-full px-2 py-1 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary font-bold"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={getLocalOrStored(field) ?? ''}
                      onChange={(e) => {
                        const v = field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
                        setLocal(field.key, v);
                      }}
                      className="w-full px-2 py-1 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary font-mono"
                    />
                  )}
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    onClick={() => handleSaveWith(field, getLocalOrStored(field))}
                    disabled={savingKey === field.key}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-accent-success/40 bg-accent-success/10 hover:bg-accent-success/10 text-accent-success disabled:opacity-50 font-bold text-xs"
                  >
                    {savingKey === field.key ? 'SAVING...' : <><Save className="w-3.5 h-3.5" /> SAVE</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to save with local value
  async function handleSaveWith(field: SettingField, value: any) {
    setSavingKey(field.key);
    try {
      await updateSetting.mutateAsync({ key: field.key, value });
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save setting');
    } finally {
      setSavingKey(null);
    }
  }
};

export default AdminSettings;
