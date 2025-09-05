"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ThemedSelect from "@/components/ThemedSelect";
import { apiService } from "@/lib/api";
import { useToastContext } from "@/contexts/ToastContext";
import { FiAlertTriangle, FiSearch } from "react-icons/fi";

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
  { value: "Search Articles", label: "Search Articles" },
  { value: "similar_resolved", label: "Similar Resolved" },
  { value: "predict_escalation", label: "Predict Escalation" },
];

import AdminLayout from '@/components/AdminLayout';

export default function AdminPromptsPage() {
  const { success, error: errorToast } = useToastContext();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  
  // List view state
  const [subscriptions, setSubscriptions] = useState<Array<{ key: string; label: string; customer_email?: string; zendesk_subdomain?: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // State for all subscriptions when searching
  const [allSubscriptions, setAllSubscriptions] = useState<Array<{ key: string; label: string; customer_email?: string; zendesk_subdomain?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Details view state
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<string>("");
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [yaml, setYaml] = useState<string>("");
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [resettingSelected, setResettingSelected] = useState(false);
  const [showDefaultWarning, setShowDefaultWarning] = useState(false);
  const [defaultWarningAccepted, setDefaultWarningAccepted] = useState(false);
  const [hasAcceptedDefaultWarning, setHasAcceptedDefaultWarning] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [saveConfirmationAccepted, setSaveConfirmationAccepted] = useState(false);
  
  const SUBSCRIPTIONS_PER_PAGE = 5;

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Prompts';
  }, []);

  const getStringProp = (obj: unknown, key: string): string => {
    if (obj && typeof obj === 'object') {
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'string') return val;
    }
    return '';
  };

  const fetchSubscriptions = useCallback(async (page: number = 1) => {
    try {
      setLoadingSubscriptions(true);
      const response = await apiService.listSubscriptions(false, page, SUBSCRIPTIONS_PER_PAGE, true);
      
      const subscriptionsArray = Object.entries(response.subscriptions).map(([key, sub]) => ({
        key,
        label: key,
        customer_email: getStringProp(sub, 'customer_email'),
        zendesk_subdomain: getStringProp(sub, 'zendesk_subdomain')
      }));
      
      setSubscriptions(subscriptionsArray);
      setCurrentPage(page);
      setTotalCount(response.totalCount || 0);
      setTotalPages(Math.ceil((response.totalCount || 0) / SUBSCRIPTIONS_PER_PAGE));
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const fetchYaml = useCallback(async (feature?: string) => {
    if (!selectedSubscription) {
      setAvailableKeys([]);
      setYaml('');
      return;
    }

    setLoadingPrompts(true);
    try {
      if (selectedSubscription === "__default__") {
        // Load default prompts
        const resp = await apiService.getDefaultPrompts();
        const prompts = resp.prompts || {};
        setAvailableKeys(Object.keys(prompts));

        const key = feature ?? selectedFeature;
        if (key) {
          const content = (prompts[key] as string) || '';
          setYaml(content);
        } else {
          setYaml('');
        }
      } else {
        // Load subscription-specific prompts
        const resp = await apiService.getSubscriptionPrompts(selectedSubscription);
        const prompts = resp.prompts || {};
        setAvailableKeys(Object.keys(prompts));

        const key = feature ?? selectedFeature;
        if (key) {
          const content = (prompts[key] as string) || '';
          setYaml(content);
        } else {
          setYaml('');
        }
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setAvailableKeys([]);
      setYaml('');
    } finally {
      setLoadingPrompts(false);
    }
  }, [selectedSubscription, selectedFeature]);

  // Fetch prompts when subscription changes
  useEffect(() => {
    if (selectedSubscription) {
      if (selectedSubscription === "__default__") {
        // Always load prompts for default selection
        fetchYaml();
        // Show warning dialog only if not already accepted
        if (!hasAcceptedDefaultWarning) {
          setShowDefaultWarning(true);
          setDefaultWarningAccepted(false);
        }
      } else {
        // Normal subscription selection
        setShowDefaultWarning(false);
        setDefaultWarningAccepted(false);
        setHasAcceptedDefaultWarning(false);
        fetchYaml();
      }
    } else {
      setAvailableKeys([]);
      setYaml('');
      setSelectedFeature('');
      setShowDefaultWarning(false);
      setDefaultWarningAccepted(false);
      setHasAcceptedDefaultWarning(false);
    }
  }, [selectedSubscription, fetchYaml, hasAcceptedDefaultWarning]);

  // Update YAML content when feature changes (without refetching all prompts)
  useEffect(() => {
    if (selectedFeature && availableKeys.length > 0) {
      // Only fetch YAML content for the selected feature
      (async () => {
        if (!selectedSubscription) return;
        try {
          setLoadingPrompts(true);
          const resp = await apiService.getSubscriptionPrompts(selectedSubscription);
          const prompts = resp.prompts || {};
          const content = prompts[selectedFeature] || '';
          setYaml(content);
        } catch (error) {
          console.error('Failed to load feature prompt:', error);
          setYaml('');
        } finally {
          setLoadingPrompts(false);
        }
      })();
    } else if (!selectedFeature) {
      setYaml('');
    }
  }, [selectedFeature, selectedSubscription, availableKeys.length]);

  // Options need to be defined before effects that depend on them
  // Filtered subscriptions based on search term
  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return subscriptions;
    
    const term = searchTerm.toLowerCase();
    return allSubscriptions.filter(subscription => 
      (subscription.customer_email?.toLowerCase().includes(term)) ||
      subscription.key.toLowerCase().includes(term) ||
      (subscription.zendesk_subdomain?.toLowerCase().includes(term))
    );
  }, [allSubscriptions, subscriptions, searchTerm]);

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

  const save = async () => {
    if (!selectedSubscription) return;

    // Show confirmation dialog for ALL saves to prevent accidental changes
    setShowSaveConfirmation(true);
    setSaveConfirmationAccepted(false);
  };

  const performSave = async () => {
    try {
      setSaving(true);
      if (!selectedSubscription) return;

      if (selectedSubscription === "__default__") {
        // Save default prompts
        const currentResp = await apiService.getDefaultPrompts();
        const prompts = currentResp.prompts || {};
        if (selectedFeature) {
          prompts[selectedFeature] = yaml;
        }
        const newYaml = Object.entries(prompts)
          .map(([k, v]) => `${k}: |\n${String(v).split("\n").map((line) => `  ${line}`).join("\n")}`)
          .join("\n\n");
        await apiService.updateDefaultPrompts(newYaml);
      } else {
        // Save subscription prompts
        const currentResp = await apiService.getSubscriptionPrompts(selectedSubscription);
        const prompts = currentResp.prompts || {};
        if (selectedFeature) {
          prompts[selectedFeature] = yaml;
        }
        const newYaml = Object.entries(prompts)
          .map(([k, v]) => `${k}: |\n${String(v).split("\n").map((line) => `  ${line}`).join("\n")}`)
          .join("\n\n");
        await apiService.updateSubscriptionPrompts(selectedSubscription, newYaml);
      }

      success("Prompts saved");
    } catch (error) {
      errorToast("Failed to save prompts");
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
    if (!selectedSubscription) return;
    setResettingAll(true);
    try {
      if (selectedSubscription === "__default__") {
        await apiService.resetDefaultPrompts();
        success("Reset default prompts to system defaults");
      } else {
        await apiService.resetSubscriptionPrompts(selectedSubscription);
        success("Reset all prompts to default");
      }
      fetchYaml();
    } catch (error) {
      errorToast("Failed to reset prompts");
      console.error('Failed to reset prompts:', error);
    } finally {
      setResettingAll(false);
    }
  };

  const resetSelected = async () => {
    if (!selectedSubscription || !selectedFeature) return;
    setResettingSelected(true);
    try {
      if (selectedSubscription === "__default__") {
        // For default prompts, we can't reset individual prompts, so reset all
        await apiService.resetDefaultPrompts();
        success(`Reset default prompts to system defaults`);
      } else {
        await apiService.resetSubscriptionPrompt(selectedSubscription, selectedFeature);
        success(`Reset "${selectedFeature}" to default`);
      }
      fetchYaml();
    } catch (error) {
      errorToast(`Failed to reset "${selectedFeature}"`);
      console.error('Failed to reset selected prompt:', error);
    } finally {
      setResettingSelected(false);
    }
  };

  const proceedWithDefaultPrompts = () => {
    if (defaultWarningAccepted) {
      setShowDefaultWarning(false);
      setHasAcceptedDefaultWarning(true);
      fetchYaml();
    }
  };

  const cancelDefaultPrompts = () => {
    setShowDefaultWarning(false);
    setDefaultWarningAccepted(false);
    setHasAcceptedDefaultWarning(false);
    setSelectedSubscription("");
  };

  // Handle view prompts
  const handleViewPrompts = async (subscriptionKey: string) => {
    setSelectedSubscription(subscriptionKey);
    setTimeout(() => {
      setViewMode('details');
    }, 100);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedSubscription('');
    setSelectedFeature('');
    setAvailableKeys([]);
    setYaml('');
    setShowDefaultWarning(false);
    setDefaultWarningAccepted(false);
    setHasAcceptedDefaultWarning(false);
    setTimeout(() => {
      setViewMode('list');
    }, 150);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchSubscriptions(page);
  };


  // Fetch all subscriptions for search
  const fetchAllSubscriptions = useCallback(async () => {
    try {
      setIsSearching(true);
      const response = await apiService.listSubscriptions(false, 1, 1000, true);
      
      const subscriptionsArray = Object.entries(response.subscriptions).map(([key, sub]) => ({
        key,
        label: key,
        customer_email: getStringProp(sub, 'customer_email'),
        zendesk_subdomain: getStringProp(sub, 'zendesk_subdomain')
      }));
      
      setAllSubscriptions(subscriptionsArray);
    } catch (error) {
      console.error('Error fetching all subscriptions for search:', error);
      setAllSubscriptions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = async () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    setCurrentPage(1);
    
    if (term) {
      await fetchAllSubscriptions();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
    setAllSubscriptions([]);
    setIsSearching(false);
    fetchSubscriptions(1);
  };





  return (
    <AdminLayout activeSection="prompts">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          {viewMode === 'list' ? 'Prompts' : 'Prompts'}
        </h1>
        {viewMode === 'details' && (
          <button
            onClick={handleBackToList}
            className="admin-button-outline px-4 py-2 rounded-lg"
          >
            Back
          </button>
        )}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="admin-card p-6 transition-all duration-300 ease-in-out">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Select Subscription for Prompts
              </h3>
              {searchTerm && (
                <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Filtered by: {`"${searchTerm}"`}
                </p>
              )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="px-3 py-2 rounded-l-lg text-sm border-0 outline-none"
                  style={{ color: 'var(--foreground)', background: 'transparent' }}
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-2 border-l text-sm hover:bg-gray-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  title="Search"
                >
                  <FiSearch className="w-4 h-4" />
                </button>
              </div>
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  title="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {loadingSubscriptions || isSearching ? (
            <div className="space-y-4">
              {Array.from({ length: SUBSCRIPTIONS_PER_PAGE }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 rounded skeleton-block" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubscriptions.length === 0 && searchTerm ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <FiSearch className="w-12 h-12 mx-auto" style={{ color: 'var(--foreground)', opacity: 0.3 }} />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    No subscriptions found
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    No subscriptions match your search &quot;{searchTerm}&quot;. Try a different search term.
                  </p>
                </div>
              ) : (
                <>
                  {/* Default Prompts Option */}
                  <div
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--border)', background: 'var(--hover-bg)' }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                        Default Prompts
                      </div>
                      <div className="text-sm text-gray-600">
                        System-wide default prompts that affect all subscriptions
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewPrompts("__default__")}
                      className="admin-button px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      View Prompts
                    </button>
                  </div>
                  
                  {/* Regular Subscriptions */}
                  {filteredSubscriptions.map((subscription) => (
                    <div
                      key={subscription.key}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div>
                        <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {subscription.customer_email || subscription.key}
                        </div>
                        <div className="text-sm text-gray-600">
                          {subscription.zendesk_subdomain || subscription.label}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewPrompts(subscription.key)}
                        className="admin-button px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        View Prompts
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && !searchTerm && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="admin-button-outline px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({totalCount} total subscriptions)
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="admin-button-outline px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Details View */}
      <div className={`transition-all duration-300 ease-in-out ${viewMode === 'details' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Subscription Info Header */}
        <div className="admin-card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            {selectedSubscription === "__default__" 
              ? "Default System Prompts" 
              : `Prompts for: ${subscriptions.find(s => s.key === selectedSubscription)?.customer_email || selectedSubscription}`
            }
          </h3>
        </div>

        {selectedSubscription && viewMode === 'details' && (
          <div className="admin-card p-6 space-y-4">
        {/* Caution Banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
          <div className="flex-shrink-0 mt-0.5"><FiAlertTriangle /></div>
          <div>
            <div className="font-semibold" style={{ color: 'var(--foreground)' }}>Important</div>
            <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.85 }}>
              Do not modify Output format field names or structure (e.g., <code>smart_summary</code>, <code>display_text</code>, <code>summary_reasoning</code>, <code>main_issue</code>, <code>key_metrics.customer_sentiment</code>, <code>confidence_score</code>). You may change descriptive text (like word counts), but renaming or removing keys can break parsing.<br/>
              Context caution: Modify the <strong>Context</strong> section at your own risk â€” it controls how ticket and related data are analyzed by the LLM.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Select Prompt to Edit</label>
            {loadingPrompts ? (
              <div className="animate-pulse">
                <div className="h-10 w-full rounded skeleton-block" />
              </div>
            ) : (
              <ThemedSelect
                value={selectedFeature}
                onChange={setSelectedFeature}
                options={featureOptions}
                placeholder={
                  selectedSubscription === "__default__" && showDefaultWarning
                    ? "Accept warning to select prompts"
                    : "Select prompt"
                }
                className="w-full"
                disabled={selectedSubscription === "__default__" && showDefaultWarning}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Prompt Editor</label>
          {loadingPrompts ? (
            <div className="animate-pulse">
              <div className="w-full h-96 rounded-lg skeleton-block" />
            </div>
          ) : (
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              className="w-full h-96 p-3 rounded-lg themed-scroll"
              style={{
                background: 'var(--card-bg)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)'
              }}
              placeholder={
                !selectedSubscription
                  ? "Select a subscription or Default Prompts first"
                  : selectedSubscription === "__default__" && showDefaultWarning
                  ? "Accept the warning to proceed with editing default prompts"
                  : "Select a prompt to edit its content"
              }
              disabled={!selectedSubscription || !selectedFeature || (selectedSubscription === "__default__" && showDefaultWarning)}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {loadingPrompts ? (
            <div className="flex gap-2 animate-pulse">
              <div className="h-10 w-16 rounded-lg skeleton-block" />
              <div className="h-10 w-28 rounded-lg skeleton-block" />
              <div className="h-10 w-20 rounded-lg skeleton-block" />
              <div className="h-10 w-20 rounded-lg skeleton-block" />
            </div>
          ) : (
            <>
              <button onClick={save} disabled={saving || !selectedSubscription || !selectedFeature} className="admin-button px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              {selectedSubscription !== "__default__" && (
                <button onClick={resetAll} disabled={resettingAll || !selectedSubscription} className="admin-button-outline px-4 py-2 rounded-lg disabled:opacity-50">
                  {resettingAll ? 'Resetting...' : 'Reset to Defaults'}
                </button>
              )}
              {selectedSubscription !== "__default__" && (
                <button onClick={resetSelected} disabled={resettingSelected || !selectedSubscription || !selectedFeature} className="admin-button-outline px-4 py-2 rounded-lg disabled:opacity-50">
                  {resettingSelected ? 'Resetting...' : 'Restore Selected'}
                </button>
              )}
            </>
          )}
          </div>
        </div>
        )}
      </div>
    </div>

    {/* Default Prompts Warning Modal */}
    {showDefaultWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--modal-overlay)' }}>
        <div className="rounded-lg p-6 w-full max-w-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <FiAlertTriangle className="text-yellow-500 text-xl flex-shrink-0" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              System-Wide Default Prompts
            </h2>
          </div>
          <div className="text-sm space-y-2" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            <p>
              <strong>Warning:</strong> You are about to edit system-wide default prompts that affect all subscriptions.
            </p>
            <p>
              Changes to these prompts will impact the behavior of AI features across the entire platform.
              Incorrect modifications may cause:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Broken AI responses</li>
              <li>Inconsistent behavior across subscriptions</li>
              <li>Service disruptions for end users</li>
              <li>Potential data integrity issues</li>
            </ul>
            <p className="mb-4">
              <strong>Recommendation:</strong> Only proceed if you are an experienced administrator
              and have thoroughly tested your changes in a development environment.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6 p-3 rounded-lg" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
            <input
              type="checkbox"
              id="accept-default-warning"
              checked={defaultWarningAccepted}
              onChange={(e) => setDefaultWarningAccepted(e.target.checked)}
              className="rounded"
              style={{
                accentColor: 'var(--accent)',
                border: '1px solid var(--border)'
              }}
            />
            <label
              htmlFor="accept-default-warning"
              className="text-sm cursor-pointer"
              style={{ color: 'var(--foreground)' }}
            >
              I understand the risks and accept responsibility for modifying system-wide default prompts
            </label>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={cancelDefaultPrompts}
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
              onClick={proceedWithDefaultPrompts}
              disabled={!defaultWarningAccepted}
              className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: defaultWarningAccepted ? 'var(--accent)' : 'var(--border)',
                color: defaultWarningAccepted ? 'white' : 'var(--foreground)',
                opacity: defaultWarningAccepted ? 1 : 0.5
              }}
            >
              Proceed with Caution
            </button>
          </div>
        </div>
      </div>
    )}

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
              You are about to save modifications to{" "}
              <strong>
                {selectedSubscription === "__default__"
                  ? "system-wide default prompts that affect all subscriptions"
                  : `prompts for subscription "${selectedSubscription}"`
                }
              </strong>.
            </p>
            {selectedSubscription === "__default__" ? (
              <div>
                <p>These changes will affect:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>All existing subscriptions</li>
                  <li>New subscriptions created in the future</li>
                  <li>AI behavior across the entire platform</li>
                </ul>
              </div>
            ) : (
              <p>This will update the prompt behavior for this specific subscription.</p>
            )}
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
              I confirm that I want to save these changes{" "}
              {selectedSubscription === "__default__"
                ? "to system-wide default prompts"
                : `to the "${selectedFeature}" prompt`
              }
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
    </AdminLayout>
  );
}

