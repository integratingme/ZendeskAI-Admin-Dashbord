"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ThemedSelect from "@/components/ThemedSelect";
import { apiService } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { FiAlertTriangle } from "react-icons/fi";

const FEATURE_OPTIONS = [
  { value: "summarize", label: "Summarize" },
  { value: "analyze_status", label: "Analyze Status" },
  { value: "auto_agent", label: "Auto Agent" },
  { value: "detect_intent", label: "Detect Intent" },
  { value: "enhance_text", label: "Enhance Text" },
  { value: "intelligent_triage", label: "Intelligent Triage" },
  { value: "merge", label: "Merge Candidates" },
  { value: "qa_analysis", label: "QA Analysis" },
  { value: "suggest_reply", label: "Suggest Reply" },
  { value: "suggest_tags", label: "Suggest Tags" },
  { value: "articles_ticket_analysis", label: "Articles: Step 1 — Ticket Analysis & Strategy" },
  { value: "search_articles_intelligent_analysis", label: "Articles: Step 2 — Ranking & Recommendations" },
  { value: "ticket_chronological_analysis", label: "Similar Resolved: Chronological Analysis" },
  { value: "similar_resolved_analysis", label: "Similar Resolved: Analysis" },
  { value: "predict_escalation", label: "Predict Escalation" },
];

export default function AdminPrompts() {
  const { success, error: errorToast, info } = useToast();
  const [subscriptions, setSubscriptions] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<string>("");
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [yaml, setYaml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { subscriptions } = await apiService.listSubscriptions(false);
        const mapped = Object.keys(subscriptions).map((key) => ({ key, label: key }));
        setSubscriptions(mapped);
      } catch (error) {
        // ignore, shown in UI
        console.error('Failed to load subscriptions:', error);
      }
    })();
  }, []);

  const fetchYaml = useCallback(async () => {
    if (!selectedSubscription || !selectedFeature) return;
    
    setIsLoading(true);
    try {
      const resp = await apiService.getSubscriptionPrompts(selectedSubscription);
      const prompts = resp.prompts || {};
      setAvailableKeys(Object.keys(prompts));
      const content = prompts[selectedFeature] || '';
      setYaml(content);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // We'll handle the error display in the UI instead of using errorToast here
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubscription, selectedFeature]);

  useEffect(() => {
    fetchYaml();
  }, [fetchYaml]);

  // Options need to be defined before effects that depend on them
  const subscriptionOptions = useMemo(
    () => subscriptions.map(s => ({ value: s.key, label: s.label })),
    [subscriptions]
  );

  // Merge static feature options with dynamic keys from YAML, sorted alphabetically by label
  const featureOptions = useMemo(() => {
    const known = FEATURE_OPTIONS.map(o => ({ ...o }));
    const knownSet = new Set(known.map(o => o.value));

    const dynamic = (availableKeys || [])
      .filter(k => !knownSet.has(k) && !k.startsWith('_'))
      .map(k => ({
        value: k,
        label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));

    const merged = [...known, ...dynamic];
    // Alphabetical order by label
    merged.sort((a, b) => a.label.localeCompare(b.label));
    return merged;
  }, [availableKeys]);

  // Pick first available feature once options are available
  useEffect(() => {
    if (!selectedFeature && featureOptions.length > 0) {
      setSelectedFeature(featureOptions[0].value);
    }
  }, [featureOptions, selectedFeature]);

  const save = async () => {
    try {
      setIsLoading(true);
      if (!selectedSubscription) return;
      // If a specific feature is selected, we need to reconstruct YAML by fetching existing, updating that key
      const currentResp = await apiService.getSubscriptionPrompts(selectedSubscription);
      const prompts = currentResp.prompts || {};
      if (selectedFeature) {
        prompts[selectedFeature] = yaml;
      } else {
        // Full YAML editor not provided; keep as is
      }
      const newYaml = Object.entries(prompts)
        .map(([k, v]) => `${k}: |\n${String(v).split("\n").map((line) => `  ${line}`).join("\n")}`)
        .join("\n\n");
      await apiService.updateSubscriptionPrompts(selectedSubscription, newYaml); /* replaced raw request with typed method */
      
      success("Prompts saved");
    } catch (error) {
      errorToast("Failed to save prompts");
      console.error('Failed to save prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = async () => {
    if (!selectedSubscription) return;
    setIsLoading(true);
    try {
      await apiService.resetSubscriptionPrompts(selectedSubscription);
      success("Reset to default");
      fetchYaml();
    } catch (error) {
      errorToast("Failed to reset");
      console.error('Failed to reset prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reload = async () => {
    if (!selectedSubscription) return;
    setIsLoading(true);
    try {
      await apiService.reloadSubscriptionPrompts(selectedSubscription);
      info("Reloaded");
    } catch (error) {
      errorToast("Failed to reload");
      console.error('Failed to reload prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const download = async () => {
    if (!selectedSubscription) return;
    try {
      const resp = await apiService.downloadSubscriptionPrompts(selectedSubscription);
      const blob = new Blob([resp.yaml || ""], { type: "text/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedSubscription}.yaml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      errorToast("Failed to download YAML");
      console.error('Failed to download YAML:', error);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Prompts</h1>
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
            <label className="block text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Subscription</label>
            <ThemedSelect value={selectedSubscription} onChange={setSelectedSubscription} options={subscriptionOptions} placeholder="Select subscription" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Feature</label>
            <ThemedSelect value={selectedFeature} onChange={setSelectedFeature} options={featureOptions} placeholder="Select feature" className="w-full" />
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
          <button onClick={download} disabled={isLoading} className="admin-button-outline px-4 py-2 rounded-lg">
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
