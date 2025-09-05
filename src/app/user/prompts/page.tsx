'use client';

import { useCallback, useEffect, useState } from 'react';
import ThemedSelect from '@/components/ThemedSelect';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { FiAlertTriangle } from 'react-icons/fi';
import UserLayout from '@/components/UserLayout';

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
  { value: 'Search Articles', label: 'Search Articles' },
  { value: 'similar_resolved', label: 'Similar Resolved' },
  { value: 'predict_escalation', label: 'Predict Escalation' },
];

export default function UserPrompts() {
  const { user } = useUserAuth();
  const token = user?.access_token;
  const { success, error: errorToast } = useToastContext();
  const [yaml, setYaml] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [resettingSelected, setResettingSelected] = useState(false);
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [saveConfirmationAccepted, setSaveConfirmationAccepted] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'User Dashboard - Prompts';
  }, []);


  const fetchYaml = useCallback(async () => {
    if (!token || !selectedFeature) return;
    
    setIsFetchingPrompt(true);
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
      setIsFetchingPrompt(false);
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

    // Show confirmation dialog for ALL saves to prevent accidental changes
    setShowSaveConfirmation(true);
    setSaveConfirmationAccepted(false);
  };

  const performSave = async () => {
    if (!token) return;
    setSaving(true);
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
      setSaving(false);
    }
  };

  const confirmSave = () => {
    if (saveConfirmationAccepted) {
      setShowSaveConfirmation(false);
      performSave();
    }
  };

  const cancelSaveConfirmation = () => {
    setShowSaveConfirmation(false);
    setSaveConfirmationAccepted(false);
  };

  const resetAll = async () => {
    if (!token) return;
    setResettingAll(true);
    try {
      const r = await fetch('/api/user/prompts/reset', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed');
      success('Reset all prompts to default');
      fetchYaml();
    } catch (error) {
      errorToast('Failed to reset all prompts');
      console.error('Failed to reset prompts:', error);
    } finally {
      setResettingAll(false);
    }
  };

  const resetSelected = async () => {
    if (!token || !selectedFeature) return;
    setResettingSelected(true);
    try {
      const r = await fetch(`/api/user/prompts/reset/${selectedFeature}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed');
      success(`Reset "${selectedFeature}" to default`);
      fetchYaml();
    } catch (error) {
      errorToast(`Failed to reset "${selectedFeature}"`);
      console.error('Failed to reset selected prompt:', error);
    } finally {
      setResettingSelected(false);
    }
  };


  return (
    <UserLayout activeSection="prompts">
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
          {isFetchingPrompt ? (
            <div className="p-3 rounded-lg animate-pulse" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <div className="space-y-2">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 rounded skeleton-block ${i % 5 === 0 ? 'w-full' : i % 5 === 1 ? 'w-11/12' : i % 5 === 2 ? 'w-10/12' : i % 5 === 3 ? 'w-9/12' : 'w-8/12'}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              className="w-full h-96 p-3 rounded-lg themed-scroll"
              style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              placeholder="Select a feature to edit its prompt"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
           <button onClick={save} disabled={saving} className="admin-button px-4 py-2 rounded-lg">
             {saving ? 'Saving...' : 'Save'}
           </button>
           <button onClick={resetAll} disabled={resettingAll} className="admin-button-outline px-4 py-2 rounded-lg">
             {resettingAll ? 'Resetting...' : 'Restore All'}
           </button>
           <button onClick={resetSelected} disabled={resettingSelected || !selectedFeature} className="admin-button-outline px-4 py-2 rounded-lg">
             {resettingSelected ? 'Resetting...' : 'Restore Selected'}
           </button>
         </div>
       </div>
 
       {/* Save Confirmation Modal */}
       {showSaveConfirmation && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--modal-overlay)' }}>
           <div className="rounded-lg p-6 w-full max-w-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
             <div className="flex items-center gap-3 mb-4">
               <FiAlertTriangle className="text-yellow-500 text-xl flex-shrink-0" />
               <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                 Confirm Save Changes
               </h2>
             </div>
             <div className="text-sm space-y-2" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
               <p>
                 <strong>Are you sure you want to save these changes?</strong>
               </p>
               <p>
                 You are about to save modifications to your{" "}
                 <strong>
                   {selectedFeature ? `"${selectedFeature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}"` : 'selected'}
                 </strong>{" "}
                 prompt configuration.
               </p>
               <p>
                 This will update how the AI feature behaves for your account.
               </p>
               <p>
                 <strong>Please ensure you have tested these changes thoroughly.</strong>
               </p>
             </div>
 
             <div className="flex items-center gap-3 mb-6 p-3 rounded-lg mt-4" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
               <input
                 type="checkbox"
                 id="confirm-save-changes"
                 checked={saveConfirmationAccepted}
                 onChange={(e) => setSaveConfirmationAccepted(e.target.checked)}
                 className="rounded"
                 style={{
                   accentColor: 'var(--accent)',
                   border: '1px solid var(--border)'
                 }}
               />
               <label
                 htmlFor="confirm-save-changes"
                 className="text-sm cursor-pointer"
                 style={{ color: 'var(--foreground)' }}
               >
                 I confirm that I want to save these changes to my prompt configuration
               </label>
             </div>
 
             <div className="flex gap-3 justify-end">
               <button
                 onClick={cancelSaveConfirmation}
                 className="px-4 py-2 rounded-lg transition-colors"
                 style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.backgroundColor = 'transparent';
                 }}
               >
                 Cancel
               </button>
               <button
                 onClick={confirmSave}
                 disabled={!saveConfirmationAccepted}
                 className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 style={{
                   background: saveConfirmationAccepted ? 'var(--accent)' : 'var(--border)',
                   color: saveConfirmationAccepted ? 'white' : 'var(--foreground)',
                   opacity: saveConfirmationAccepted ? 1 : 0.5
                 }}
               >
                 Save Changes
               </button>
             </div>
           </div>
         </div>
       )}
       </div>
     </UserLayout>
   );
 }
