'use client';

import { useCallback, useEffect, useState } from 'react';
import ThemedSelect from '@/components/ThemedSelect';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useToast } from '@/components/Toast';
import { FiAlertTriangle } from 'react-icons/fi';

const FEATURE_OPTIONS = [
  { value: 'summarize', label: 'Summarize' },
  { value: 'analyze_status', label: 'Analyze Status' },
  { value: 'auto_agent', label: 'Auto Agent' },
  { value: 'detect_intent', label: 'Detect Intent' },
  { value: 'enhance_text', label: 'Enhance Text' },
  { value: 'intelligent_triage', label: 'Intelligent Triage' },
  { value: 'merge', label: 'Merge Candidates' },
  { value: 'qa_analysis', label: 'QA Analysis' },
  { value: 'suggest_reply', label: 'Suggest Reply' },
  { value: 'suggest_tags', label: 'Suggest Tags' },
  { value: 'articles_ticket_analysis', label: 'Articles: Step 1 — Ticket Analysis & Strategy' },
  { value: 'search_articles_intelligent_analysis', label: 'Articles: Step 2 — Ranking & Recommendations' },
  { value: 'ticket_chronological_analysis', label: 'Similar Resolved: Chronological Analysis' },
  { value: 'similar_resolved_analysis', label: 'Similar Resolved: Analysis' },
  { value: 'predict_escalation', label: 'Predict Escalation' },
];

export default function UserPrompts() {
  const { user } = useUserAuth();
  const token = user?.access_token;
  const { success, error: errorToast, info } = useToast();
  const [yaml, setYaml] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  const fetchYaml = useCallback(async () => {
    if (!token || !selectedFeature) return;
    
    setIsLoading(true);
    try {
      const resp = await fetch('/api/user/prompts', { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Failed');
      const data = await resp.json();
      const prompts = data.prompts || {};
      setAvailableKeys(Object.keys(prompts));
      const content = prompts[selectedFeature] || '';
      setYaml(content);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // We'll handle the error display in the UI instead of using errorToast here
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedFeature]);

  useEffect(() => {
    fetchYaml();
  }, [fetchYaml]);

  // Pick first available feature once options are available
  useEffect(() => {
    if (!selectedFeature) {
      const merged = [
        ...FEATURE_OPTIONS,
        ...(
          (availableKeys || [])
            .filter(k => !FEATURE_OPTIONS.some(o => o.value === k) && !k.startsWith('_'))
            .map(k => ({ value: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
        )
      ].sort((a, b) => a.label.localeCompare(b.label));
      if (merged.length > 0) {
        setSelectedFeature(merged[0].value);
      }
    }
  }, [availableKeys, selectedFeature]);

  const save = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // Fetch current prompts, update the selected key, and send full YAML
      const resp = await fetch('/api/user/prompts', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      const prompts = data.prompts || {};
      if (selectedFeature) {
        prompts[selectedFeature] = yaml;
      }
      const newYaml = Object.entries(prompts)
        .map(([k, v]) => `${k}: |\n${String(v).split('\n').map((line) => `  ${line}`).join('\n')}`)
        .join('\n\n');
      const upd = await fetch('/api/user/prompts/update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml_content: newYaml }),
      });
      if (!upd.ok) throw new Error('Failed');
      success('Prompts saved');
    } catch (error) {
      errorToast('Failed to save prompts');
      console.error('Failed to save prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const r = await fetch('/api/user/prompts/reset', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed');
      success('Reset to default');
      fetchYaml();
    } catch (error) {
      errorToast('Failed to reset');
      console.error('Failed to reset prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reload = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const r = await fetch('/api/user/prompts/reload', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed');
      info('Reloaded');
    } catch (error) {
      errorToast('Failed to reload');
      console.error('Failed to reload prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Manage prompts for available features</h1>
      </div>

      <div className="admin-card p-6 space-y-4">
        {/* Caution Banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
          <div className="flex-shrink-0 mt-0.5"><FiAlertTriangle /></div>
          <div>
            <div className="font-semibold" style={{ color: 'var(--foreground)' }}>Important</div>
            <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.85 }}>
              Do not modify Output format field names or structure (e.g., <code>smart_summary</code>, <code>display_text</code>, <code>summary_reasoning</code>, <code>main_issue</code>, <code>key_metrics.customer_sentiment</code>, <code>confidence_score</code>). You may change descriptive text (like word counts), but renaming or removing keys can break parsing.<br/>
              Context caution: Modify the <strong>Context</strong> section at your own risk — it controls how ticket and related data are analyzed by the LLM.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="md:col-span-3">
           <label className="block text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Feature</label>
           <ThemedSelect
             value={selectedFeature}
             onChange={setSelectedFeature}
             options={[
               ...FEATURE_OPTIONS,
               ...(
                 (availableKeys || [])
                   .filter(k => !FEATURE_OPTIONS.some(o => o.value === k) && !k.startsWith('_'))
                   .map(k => ({ value: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
               )
             ].sort((a, b) => a.label.localeCompare(b.label))}
             placeholder="Select feature"
           />
         </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Prompt Editor</label>
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            className="w-full h-96 p-3 rounded-lg themed-scroll"
            style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            placeholder="Select a feature to edit its prompt"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={isLoading} className="admin-button px-4 py-2 rounded-lg">
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          <button onClick={reset} disabled={isLoading} className="admin-button-outline px-4 py-2 rounded-lg">
            {isLoading ? 'Resetting...' : 'Restore Default'}
          </button>
          <button onClick={reload} disabled={isLoading} className="admin-button-outline px-4 py-2 rounded-lg">
            {isLoading ? 'Reloading...' : 'Reload'}
          </button>
        </div>
      </div>
    </div>
  );
}
