"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ThemedSelect from "@/components/ThemedSelect";
import { apiService, ApiError } from "@/lib/api";
import { useToastContext } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FiRefreshCw, FiX, FiRotateCcw, FiSearch } from "react-icons/fi";
import { MdOutlineContentCopy } from "react-icons/md";
import { IoMdCheckmark } from "react-icons/io";
import TierTemplateSelector from "@/components/TierTemplateSelector";
import DateRangePicker from "@/components/DateRangePicker";

interface ProviderData {
  [key: string]: unknown;
}

interface Subscription {
  subscription_key: string;
  customer_email: string;
  zendesk_subdomain: string;
  subscription_days?: number; // Legacy field
  start_date: string;
  end_date: string;
  tier_template?: string;
  request_limit: number;
  current_usage: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  main_llm: {
    provider: string;
    model: string;
    endpoint?: string;
    input_price_per_million?: number;
    output_price_per_million?: number;
  };
  fallback_llm: {
    provider: string;
    model: string;
    endpoint?: string;
    input_price_per_million?: number;
    output_price_per_million?: number;
  };
  usage_stats?: {
    main_llm_usage?: {
      total_requests?: number;
      estimated_cost_usd?: number;
    };
    fallback_llm_usage?: {
      total_requests?: number;
      estimated_cost_usd?: number;
    };
  };
}

import AdminLayout from "@/components/AdminLayout";

export default function AdminSubscriptionsPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };
  const toast = useToastContext();

  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard - Subscriptions';
  }, []);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [usageLoading, setUsageLoading] = useState<boolean>(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [providers, setProviders] = useState<{ [key: string]: ProviderData }>(
    {}
  );
  // For server-side pagination, we don't need client-side slicing
  const pagedSubscriptions = useMemo(() => subscriptions, [subscriptions]);
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    subscriptionKey: string;
    customerEmail: string;
  }>({ isOpen: false, subscriptionKey: "", customerEmail: "" });
  const [reactivateDialog, setReactivateDialog] = useState<{
    isOpen: boolean;
    subscriptionKey: string;
    customerEmail: string;
  }>({ isOpen: false, subscriptionKey: "", customerEmail: "" });
  const [permanentDialog, setPermanentDialog] = useState<{
    isOpen: boolean;
    subscriptionKey: string;
    customerEmail: string;
  }>({ isOpen: false, subscriptionKey: "", customerEmail: "" });
  const [reactivating, setReactivating] = useState<string | null>(null);
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    customer_email: "",
    zendesk_subdomain: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    tier_template: "",
    request_limit: 1000,
    main_llm: {
      provider: "",
      endpoint: "",
      model: "",
      api_key: "",
      input_price_per_million: 0,
      output_price_per_million: 0,
    },
    fallback_llm: {
      provider: "",
      endpoint: "",
      model: "",
      api_key: "",
      input_price_per_million: 0,
      output_price_per_million: 0,
    },
    features_config: {},
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    customer_email: "",
    zendesk_subdomain: "",
    start_date: "",
    end_date: "",
    tier_template: "",
    request_limit: 1000,
    main_llm: {
      provider: "",
      endpoint: "",
      model: "",
      api_key: "",
      input_price_per_million: 0,
      output_price_per_million: 0,
    },
    fallback_llm: {
      provider: "",
      endpoint: "",
      model: "",
      api_key: "",
      input_price_per_million: 0,
      output_price_per_million: 0,
    },
  });

  const fetchProviders = useCallback(async () => {
    try {
      const response = await apiService.listProviders();
      console.log("Providers response in Subscriptions:", response);

      if (
        response.success &&
        (response as unknown as Record<string, unknown>).providers
      ) {
        console.log("Using success + providers path");
        setProviders(
          (
            response as unknown as {
              providers: { [key: string]: ProviderData };
            }
          ).providers
        );
      } else if ((response as unknown as Record<string, unknown>).providers) {
        console.log("Using direct providers path");
        setProviders(
          (
            response as unknown as {
              providers: { [key: string]: ProviderData };
            }
          ).providers
        );
      } else {
        console.log("No providers found in response");
        setProviders({});
      }

      console.log(
        "Final providers set:",
        Object.keys(
          (
            response as unknown as {
              providers?: { [key: string]: Record<string, unknown> };
            }
          ).providers || {}
        )
      );
    } catch (err) {
      console.error("Error fetching providers:", err);
      toast.error(
        "Failed to load providers",
        "Unable to load LLM provider list"
      );
    }
  }, [toast]);

  const fetchSubscriptionsWithValue = useCallback(
    async (showInactiveValue: boolean, isToggleAction = false, pageNum: number = currentPage) => {
      try {
        if (isToggleAction) {
          setToggleLoading(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const { subscriptions: subs, totalCount } = await apiService.listSubscriptions(
          showInactiveValue,
          pageNum,
          pageSize,
          true // Include count for consistent pagination display
        );
        const response = { success: true, data: subs } as {
          success: boolean;
          data: Record<string, unknown>;
        };
        console.log("Subscriptions response:", response);
        console.log("Response structure:", {
          success: response.success,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          hasSubscriptions: response.data?.subscriptions ? "yes" : "no",
        });

        let subscriptionsData = null;

        // Try multiple response formats
        if (response.success && response.data?.subscriptions) {
          console.log("Using response.data.subscriptions");
          subscriptionsData = response.data.subscriptions;
        } else if (response.data && typeof response.data === "object") {
          console.log("Using response.data directly");
          subscriptionsData = response.data;
        } else if (
          (response as unknown as Record<string, unknown>).subscriptions
        ) {
          console.log("Using response.subscriptions");
          subscriptionsData = (response as unknown as Record<string, unknown>)
            .subscriptions;
        } else {
          console.log("No subscriptions data found in response");
          setSubscriptions([]);
          return;
        }

        if (subscriptionsData && typeof subscriptionsData === "object") {
          // Convert the subscriptions object to array format
          const subscriptionsArray = Object.entries(subscriptionsData).map(
            ([key, sub]) => {
              const subscription = sub as Record<string, unknown>;
              return {
                subscription_key: key,
                customer_email: subscription.customer_email as string,
                zendesk_subdomain: subscription.zendesk_subdomain as string,
                subscription_days: subscription.subscription_days as number,
                start_date:
                  (subscription.start_date as string) ||
                  (subscription.created_at as string),
                end_date:
                  (subscription.end_date as string) ||
                  (subscription.expires_at as string),
                tier_template: subscription.tier_template as string,
                request_limit: (subscription.request_limit as number) || 1000,
                current_usage: (subscription.current_usage as number) || 0,
                created_at: subscription.created_at as string,
                expires_at: subscription.expires_at as string,
                is_active: subscription.is_active as boolean,
                main_llm: {
                  provider:
                    ((subscription.main_llm as Record<string, unknown>)
                      ?.provider as string) || "unknown",
                  model:
                    ((subscription.main_llm as Record<string, unknown>)
                      ?.model as string) || "unknown",
                  endpoint:
                    ((subscription.main_llm as Record<string, unknown>)
                      ?.endpoint as string) || "",
                  input_price_per_million:
                    (
                      subscription.main_llm as {
                        input_price_per_million?: number;
                      }
                    )?.input_price_per_million ?? 0,
                  output_price_per_million:
                    (
                      subscription.main_llm as {
                        output_price_per_million?: number;
                      }
                    )?.output_price_per_million ?? 0,
                },
                fallback_llm: {
                  provider:
                    ((subscription.fallback_llm as Record<string, unknown>)
                      ?.provider as string) || "unknown",
                  model:
                    ((subscription.fallback_llm as Record<string, unknown>)
                      ?.model as string) || "unknown",
                  endpoint:
                    ((subscription.fallback_llm as Record<string, unknown>)
                      ?.endpoint as string) || "",
                  input_price_per_million:
                    (
                      subscription.fallback_llm as {
                        input_price_per_million?: number;
                      }
                    )?.input_price_per_million ?? 0,
                  output_price_per_million:
                    (
                      subscription.fallback_llm as {
                        output_price_per_million?: number;
                      }
                    )?.output_price_per_million ?? 0,
                },
                usage_stats: (subscription.usage_stats as Record<
                  string,
                  unknown
                >) || {
                  main_llm_usage: {
                    total_requests: 0,
                    estimated_cost_usd: 0.0,
                  },
                  fallback_llm_usage: {
                    total_requests: 0,
                    estimated_cost_usd: 0.0,
                  },
                },
              };
            }
          );
          console.log(
            "Parsed subscriptions:",
            subscriptionsArray.length,
            "subscriptions"
          );
          setSubscriptions(subscriptionsArray);
          setTotalCount(totalCount || 0);
          // Don't reset currentPage here - let the caller manage it
        } else {
          console.log("Invalid subscriptions data format");
          setSubscriptions([]);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`API Error: ${err.message}`);
        } else {
          setError("Failed to fetch subscriptions");
        }
        console.error("Error fetching subscriptions:", err);
      } finally {
        setLoading(false);
        setToggleLoading(false);
      }
    },
    [currentPage]
  );

  const fetchSubscriptions = useCallback(
    async (isToggleAction = false) => {
      return fetchSubscriptionsWithValue(showInactive, isToggleAction, currentPage);
    },
    [fetchSubscriptionsWithValue, showInactive, currentPage]
  );

  useEffect(() => {
    fetchSubscriptions();
    fetchProviders();
  }, [fetchSubscriptions, fetchProviders, showInactive]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customer_email) {
      toast.warning(
        "Customer Email Required",
        "Please enter a customer email address"
      );
      return;
    }

    if (!formData.main_llm.provider || !formData.fallback_llm.provider) {
      toast.warning(
        "Providers Required",
        "Please select both main and fallback LLM providers"
      );
      return;
    }

    if (!formData.main_llm.api_key || !formData.fallback_llm.api_key) {
      toast.warning(
        "API Keys Required",
        "Please provide API keys for both LLM providers"
      );
      return;
    }

    setCreating(true);
    try {
      const response = await apiService.createSubscription(formData);
      if (response.success) {
        const subscriptionKey =
          ((response.data as Record<string, unknown>)
            ?.subscription_key as string) || "Generated";
        toast.success(
          "Subscription Created",
          `New subscription created successfully! Key: ${subscriptionKey}`
        );
        setShowCreateForm(false);
        resetForm();
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || "Failed to create subscription");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      if (err instanceof ApiError) {
        toast.error("Failed to Create Subscription", err.message);
      } else {
        toast.error(
          "Failed to Create Subscription",
          "An unexpected error occurred"
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_email: "",
      zendesk_subdomain: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      tier_template: "",
      request_limit: 1000,
      main_llm: {
        provider: "",
        endpoint: "",
        model: "",
        api_key: "",
        input_price_per_million: 0,
        output_price_per_million: 0,
      },
      fallback_llm: {
        provider: "",
        endpoint: "",
        model: "",
        api_key: "",
        input_price_per_million: 0,
        output_price_per_million: 0,
      },
      features_config: {},
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };


  const handleTierTemplateSelect = (
    templateName: string,
    template: {
      display_name: string;
      description: string;
      suggested_duration_days: number;
      suggested_request_limit: number;
      suggested_main_llm: {
        provider: string;
        model: string;
        endpoint: string;
        input_price_per_million: number;
        output_price_per_million: number;
      };
      suggested_fallback_llm: {
        provider: string;
        model: string;
        endpoint: string;
        input_price_per_million: number;
        output_price_per_million: number;
      };
      features: Record<
        string,
        {
          enabled: boolean;
          use_custom_llm: boolean;
          description?: string;
        }
      >;
    } | null
  ) => {
    if (!template) {
      // Reset to default values for custom configuration
      setFormData((prev) => ({
        ...prev,
        tier_template: "custom",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        request_limit: 1000,
        main_llm: {
          provider: "",
          endpoint: "",
          model: "",
          api_key: "",
          input_price_per_million: 0,
          output_price_per_million: 0,
        },
        fallback_llm: {
          provider: "",
          endpoint: "",
          model: "",
          api_key: "",
          input_price_per_million: 0,
          output_price_per_million: 0,
        },
        features_config: {}, // Reset to empty for custom configuration
      }));
      return;
    }

    // Calculate end date based on suggested duration
    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() +
        template.suggested_duration_days * 24 * 60 * 60 * 1000
    );

    setFormData((prev) => ({
      ...prev,
      tier_template: templateName,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      request_limit: template.suggested_request_limit,
      main_llm: {
        ...prev.main_llm,
        provider: template.suggested_main_llm.provider,
        model: template.suggested_main_llm.model,
        endpoint: template.suggested_main_llm.endpoint,
        input_price_per_million:
          template.suggested_main_llm.input_price_per_million,
        output_price_per_million:
          template.suggested_main_llm.output_price_per_million,
      },
      fallback_llm: {
        ...prev.fallback_llm,
        provider: template.suggested_fallback_llm.provider,
        model: template.suggested_fallback_llm.model,
        endpoint: template.suggested_fallback_llm.endpoint,
        input_price_per_million:
          template.suggested_fallback_llm.input_price_per_million,
        output_price_per_million:
          template.suggested_fallback_llm.output_price_per_million,
      },
      features_config: template.features || {},
    }));
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFormData((prev) => ({
      ...prev,
      start_date: startDate,
      end_date: endDate,
    }));
  };

  const handleToggleInactive = async (newValue: boolean) => {
    setShowInactive(newValue);
    setCurrentPage(1); // Reset to first page when toggling
    // Pass the new value directly to avoid stale closure issue
    await fetchSubscriptionsWithValue(newValue, true, 1);
  };

  const handleProviderChange = (
    llmType: "main_llm" | "fallback_llm",
    provider: string
  ) => {
    const providerData = providers[provider] as Record<string, unknown>;
    console.log("Provider selected:", provider, "Data:", providerData);

    if (providerData) {
      const endpoint = (providerData.endpoint as string) || "";
      const models = (providerData.example_models as string[]) || [];
      const pricing =
        (providerData.default_pricing as Record<
          string,
          { input: number; output: number }
        >) || {};

      // Get first model's pricing or default to 0
      const firstModel = models[0] || "";
      const firstPricing =
        firstModel && pricing[firstModel]
          ? pricing[firstModel]
          : { input: 0, output: 0 };

      setFormData((prev) => ({
        ...prev,
        [llmType]: {
          ...prev[llmType],
          provider,
          endpoint,
          model: firstModel,
          api_key: "",
          input_price_per_million: firstPricing.input || 0,
          output_price_per_million: firstPricing.output || 0,
        },
      }));

      console.log(
        "Updated form data for",
        llmType,
        "with endpoint:",
        endpoint,
        "model:",
        firstModel,
        "pricing:",
        firstPricing
      );
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubscription) return;

    setUpdating(true);
    try {
      // Prepare update data - only include changed fields
      const updateData: Record<string, unknown> = {};

      if (editFormData.customer_email !== selectedSubscription.customer_email) {
        updateData.customer_email = editFormData.customer_email;
      }

      if (
        editFormData.zendesk_subdomain !==
        selectedSubscription.zendesk_subdomain
      ) {
        updateData.zendesk_subdomain = editFormData.zendesk_subdomain;
      }

      if (editFormData.start_date !== selectedSubscription.start_date) {
        updateData.start_date = editFormData.start_date;
      }

      if (editFormData.end_date !== selectedSubscription.end_date) {
        updateData.end_date = editFormData.end_date;
      }

      if (editFormData.tier_template !== selectedSubscription.tier_template) {
        updateData.tier_template = editFormData.tier_template;
      }

      if (editFormData.request_limit !== selectedSubscription.request_limit) {
        updateData.request_limit = editFormData.request_limit;
      }

      // Prepare LLM updates (only send changed fields; omit api_key if blank)
      const mainChanged =
        editFormData.main_llm.provider !==
          selectedSubscription.main_llm.provider ||
        editFormData.main_llm.model !== selectedSubscription.main_llm.model ||
        (editFormData.main_llm.endpoint || "") !==
          (selectedSubscription.main_llm.endpoint || "") ||
        (editFormData.main_llm.input_price_per_million ?? 0) !==
          (selectedSubscription.main_llm.input_price_per_million ?? 0) ||
        (editFormData.main_llm.output_price_per_million ?? 0) !==
          (selectedSubscription.main_llm.output_price_per_million ?? 0) ||
        (editFormData.main_llm.api_key?.trim()?.length ?? 0) > 0;

      if (mainChanged) {
        const main_llm_update: Record<string, unknown> = {
          provider: editFormData.main_llm.provider,
          model: editFormData.main_llm.model,
          endpoint: editFormData.main_llm.endpoint,
          input_price_per_million:
            editFormData.main_llm.input_price_per_million,
          output_price_per_million:
            editFormData.main_llm.output_price_per_million,
        };
        if (
          editFormData.main_llm.api_key &&
          editFormData.main_llm.api_key.trim().length > 0
        ) {
          main_llm_update.api_key = editFormData.main_llm.api_key;
        }
        updateData.main_llm = main_llm_update;
      }

      const fallbackChanged =
        editFormData.fallback_llm.provider !==
          selectedSubscription.fallback_llm.provider ||
        editFormData.fallback_llm.model !==
          selectedSubscription.fallback_llm.model ||
        (editFormData.fallback_llm.endpoint || "") !==
          (selectedSubscription.fallback_llm.endpoint || "") ||
        (editFormData.fallback_llm.input_price_per_million ?? 0) !==
          (selectedSubscription.fallback_llm.input_price_per_million ?? 0) ||
        (editFormData.fallback_llm.output_price_per_million ?? 0) !==
          (selectedSubscription.fallback_llm.output_price_per_million ?? 0) ||
        (editFormData.fallback_llm.api_key?.trim()?.length ?? 0) > 0;

      if (fallbackChanged) {
        const fallback_llm_update: Record<string, unknown> = {
          provider: editFormData.fallback_llm.provider,
          model: editFormData.fallback_llm.model,
          endpoint: editFormData.fallback_llm.endpoint,
          input_price_per_million:
            editFormData.fallback_llm.input_price_per_million,
          output_price_per_million:
            editFormData.fallback_llm.output_price_per_million,
        };
        if (
          editFormData.fallback_llm.api_key &&
          editFormData.fallback_llm.api_key.trim().length > 0
        ) {
          fallback_llm_update.api_key = editFormData.fallback_llm.api_key;
        }
        updateData.fallback_llm = fallback_llm_update;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info("No Changes", "No changes were made to the subscription");
        setShowEditModal(false);
        setSelectedSubscription(null);
        return;
      }

      const response = await apiService.updateSubscription(
        selectedSubscription.subscription_key,
        updateData
      );

      if (response.success) {
        toast.success(
          "Subscription Updated",
          "Subscription has been updated successfully"
        );
        setShowEditModal(false);
        setSelectedSubscription(null);
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || "Failed to update subscription");
      }
    } catch (err) {
      console.error("Error updating subscription:", err);
      toast.error("Update Failed", "Failed to update subscription");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubscription = async () => {
    // Soft delete (set is_active=false)

    try {
      const response = await apiService.deleteSubscription(
        confirmDialog.subscriptionKey
      );

      if (response.success) {
        toast.success(
          "Subscription Deleted",
          "Subscription has been deleted successfully"
        );
        setConfirmDialog({
          isOpen: false,
          subscriptionKey: "",
          customerEmail: "",
        });
        await fetchSubscriptions();
      } else {
        throw new Error(response.message || "Failed to delete subscription");
      }
    } catch (err) {
      console.error("Error deleting subscription:", err);
      toast.error("Delete Failed", "Failed to delete subscription");
    }
  };

  const canReactivateSubscription = (subscription: Subscription): boolean => {
    // Can only reactivate inactive subscriptions
    if (subscription.is_active) return false;

    // Check if the end date allows reactivation (end date should be in the future)
    const endDate = new Date(subscription.end_date);
    const now = new Date();

    return endDate > now;
  };

  const handlePermanentDelete = async () => {
    try {
      const response = await apiService.permanentlyDeleteSubscription(
        permanentDialog.subscriptionKey
      );
      if (response.success) {
        toast.success(
          "Subscription Permanently Deleted",
          "Subscription and associated data have been removed."
        );
        setPermanentDialog({
          isOpen: false,
          subscriptionKey: "",
          customerEmail: "",
        });
        await fetchSubscriptions();
      } else {
        throw new Error(
          response.message || "Failed to permanently delete subscription"
        );
      }
    } catch (err) {
      console.error("Error permanently deleting subscription:", err);
      toast.error(
        "Permanent Delete Failed",
        "Failed to permanently delete subscription"
      );
    }
  };

  const handleReactivateSubscription = async () => {
    if (!reactivateDialog.subscriptionKey) return;

    try {
      setReactivating(reactivateDialog.subscriptionKey);
      const response = await apiService.reactivateSubscription(
        reactivateDialog.subscriptionKey
      );

      if (response.success) {
        toast.success(
          "Subscription Reactivated",
          "Subscription has been reactivated successfully"
        );
        setReactivateDialog({
          isOpen: false,
          subscriptionKey: "",
          customerEmail: "",
        });
        await fetchSubscriptions();
      } else {
        throw new Error(
          response.message || "Failed to reactivate subscription"
        );
      }
    } catch (err) {
      console.error("Error reactivating subscription:", err);
      toast.error("Reactivation Failed", "Failed to reactivate subscription");
    } finally {
      setReactivating(null);
    }
  };

  // State for all subscriptions when searching
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all subscriptions for search
  const fetchAllSubscriptions = useCallback(async (showInactiveValue: boolean) => {
    try {
      setIsSearching(true);
      const { subscriptions: subs } = await apiService.listSubscriptions(
        showInactiveValue,
        1,
        1000, // Get a large number to get all subscriptions
        true
      );

      const subscriptionsArray = Object.entries(subs).map(([key, sub]) => {
        const subscription = sub as Record<string, unknown>;
        return {
          subscription_key: key,
          customer_email: subscription.customer_email as string,
          zendesk_subdomain: subscription.zendesk_subdomain as string,
          subscription_days: subscription.subscription_days as number,
          start_date: (subscription.start_date as string) || (subscription.created_at as string),
          end_date: (subscription.end_date as string) || (subscription.expires_at as string),
          tier_template: subscription.tier_template as string,
          request_limit: (subscription.request_limit as number) || 1000,
          current_usage: (subscription.current_usage as number) || 0,
          created_at: subscription.created_at as string,
          expires_at: subscription.expires_at as string,
          is_active: subscription.is_active as boolean,
          main_llm: {
            provider: ((subscription.main_llm as Record<string, unknown>)?.provider as string) || "unknown",
            model: ((subscription.main_llm as Record<string, unknown>)?.model as string) || "unknown",
            endpoint: ((subscription.main_llm as Record<string, unknown>)?.endpoint as string) || "",
            input_price_per_million: (subscription.main_llm as { input_price_per_million?: number })?.input_price_per_million ?? 0,
            output_price_per_million: (subscription.main_llm as { output_price_per_million?: number })?.output_price_per_million ?? 0,
          },
          fallback_llm: {
            provider: ((subscription.fallback_llm as Record<string, unknown>)?.provider as string) || "unknown",
            model: ((subscription.fallback_llm as Record<string, unknown>)?.model as string) || "unknown",
            endpoint: ((subscription.fallback_llm as Record<string, unknown>)?.endpoint as string) || "",
            input_price_per_million: (subscription.fallback_llm as { input_price_per_million?: number })?.input_price_per_million ?? 0,
            output_price_per_million: (subscription.fallback_llm as { output_price_per_million?: number })?.output_price_per_million ?? 0,
          },
          usage_stats: (subscription.usage_stats as Record<string, unknown>) || {
            main_llm_usage: { total_requests: 0, estimated_cost_usd: 0.0 },
            fallback_llm_usage: { total_requests: 0, estimated_cost_usd: 0.0 },
          },
        };
      });
      
      setAllSubscriptions(subscriptionsArray);
    } catch (err) {
      console.error('Error fetching all subscriptions for search:', err);
      setAllSubscriptions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search handlers
  const handleSearch = async () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    setCurrentPage(1);
    
    if (term) {
      // Fetch all subscriptions for search
      await fetchAllSubscriptions(showInactive);
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
    // Return to normal paginated view
    fetchSubscriptionsWithValue(showInactive, false, 1);
  };

  // Filtered subscriptions based on search term
  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return pagedSubscriptions;
    
    const term = searchTerm.toLowerCase();
    return allSubscriptions.filter(subscription => 
      subscription.customer_email.toLowerCase().includes(term) ||
      subscription.subscription_key.toLowerCase().includes(term) ||
      subscription.zendesk_subdomain.toLowerCase().includes(term) ||
      (subscription.tier_template?.toLowerCase().includes(term))
    );
  }, [allSubscriptions, pagedSubscriptions, searchTerm]);

  if (loading) {
    return (
      <AdminLayout activeSection="subscriptions">
        <div className="space-y-6 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 rounded skeleton-block" />
            <div className="flex gap-3">
              <div className="h-8 w-24 rounded skeleton-block" />
              <div className="h-8 w-36 rounded skeleton-block" />
            </div>
          </div>

          {/* Filter Controls skeleton */}
          <div className="admin-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="h-5 w-64 rounded skeleton-block" />
              <div className="h-6 w-40 rounded skeleton-block" />
            </div>
          </div>

          {/* Table skeleton */}
          <div className="admin-card overflow-hidden">
            {/* Table header */}
            <div
              className="p-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`th-${i}`}
                    className="h-4 w-24 rounded skeleton-block"
                  />
                ))}
              </div>
            </div>
            {/* Table rows */}
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`tr-${i}`} className="p-4 grid grid-cols-4 gap-4">
                  <div className="h-4 w-40 rounded skeleton-block" />
                  <div className="h-4 w-32 rounded skeleton-block" />
                  <div className="h-4 w-20 rounded skeleton-block" />
                  <div className="h-4 w-24 rounded skeleton-block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeSection="subscriptions">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => fetchSubscriptions()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="subscriptions">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Subscriptions
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => fetchSubscriptions()}
              className="admin-button-outline px-4 py-2 rounded-lg flex items-center gap-2"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="admin-button px-4 py-2 rounded-lg flex items-center gap-2"
            >
              Create Subscription
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="admin-card p-4">
          <div className="flex flex-col gap-4">
            {/* Top Row - Toggle and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: "var(--foreground)" }}
                >
                  Show inactive subscriptions
                </span>
                <button
                  onClick={() => handleToggleInactive(!showInactive)}
                  disabled={toggleLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ease-in-out ${
                    showInactive
                      ? "focus:ring-orange-500"
                      : "focus:ring-gray-400"
                  }`}
                  style={{
                    backgroundColor: showInactive
                      ? "var(--accent)"
                      : "var(--border)",
                    transition: "background-color 0.3s ease",
                  }}
                  role="switch"
                  aria-checked={showInactive}
                  aria-label="Toggle inactive subscriptions"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full transform transition-transform duration-300 ease-in-out ${
                      showInactive ? "translate-x-6" : "translate-x-1"
                    }`}
                    style={{
                      backgroundColor: "var(--card-bg)",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </button>
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
                    className="px-3 py-2 rounded-l-lg text-sm border-0 outline-none w-full sm:w-auto"
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
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 whitespace-nowrap"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    title="Clear search"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row - Subscription Count and Filter Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div
                className="text-sm font-medium"
                style={{ color: "var(--foreground)", opacity: 0.7 }}
              >
                {totalCount ? `${totalCount} subscription${totalCount !== 1 ? "s" : ""} found` : `${subscriptions.length} subscription${subscriptions.length !== 1 ? "s" : ""} loaded`}
              </div>
              {searchTerm && (
                <div className="text-sm" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                  Filtered by: &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        <div>
          {isSearching ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 w-full rounded skeleton-block" />
                </div>
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 && searchTerm ? (
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
              {/* Header - Hidden on mobile */}
              <div className="hidden md:block admin-card p-4" style={{ borderBottom: "1px solid var(--border)", borderRadius: "8px 8px 0 0" }}>
                <div className="grid grid-cols-4 gap-6">
                  <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                    Customer
                  </h4>
                  <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                    Subscription
                  </h4>
                  <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                    Status
                  </h4>
                  <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                    Actions
                  </h4>
                </div>
              </div>

              {/* Subscription Items */}
              {filteredSubscriptions.map((subscription, index) => (
                <div
                  key={subscription.subscription_key}
                  className="admin-card p-4 md:p-6"
                  style={{ 
                    borderTop: "none",
                    borderRadius: index === filteredSubscriptions.length - 1 ? "0 0 8px 8px" : "0",
                    marginTop: "0"
                  }}
                >
                  {/* Mobile Layout */}
                  <div className="block md:hidden space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                          {subscription.customer_email}
                        </div>
                        <div className="text-sm" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                          {subscription.zendesk_subdomain}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium px-2 py-1 rounded" style={{ 
                          color: "var(--accent)",
                          backgroundColor: "var(--hover-bg)"
                        }}>
                          {subscription.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div style={{ color: "var(--foreground)" }}>
                        {subscription.tier_template
                          ? subscription.tier_template.charAt(0).toUpperCase() + subscription.tier_template.slice(1)
                          : "Custom"}
                      </div>
                      <div style={{ color: "var(--foreground)", opacity: 0.7 }}>
                        {subscription.request_limit === -1
                          ? "Unlimited"
                          : `${subscription.request_limit.toLocaleString()} requests`}
                      </div>
                      <div style={{ color: "var(--foreground)", opacity: 0.7 }}>
                        Expires: {formatDate(subscription.end_date)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <button
                        onClick={async () => {
                          setSelectedSubscription(subscription);
                          setUsageLoading(true);
                          setUsageError(null);
                          setShowViewModal(true);
                          requestAnimationFrame(() => setViewModalVisible(true));
                          try {
                            const usage = await apiService.getSubscriptionUsage(subscription.subscription_key);
                            const usage_stats = (usage as { usage_stats?: Subscription["usage_stats"] | Record<string, unknown> }).usage_stats || null;
                            setSelectedSubscription({ ...subscription, usage_stats: usage_stats || undefined });
                          } catch (e) {
                            console.error("Failed to load usage stats", e);
                            setUsageError("Failed to load usage stats");
                          } finally {
                            setUsageLoading(false);
                          }
                        }}
                        className="px-3 py-1 text-xs border rounded transition-colors"
                        style={{ 
                          color: "var(--foreground)",
                          borderColor: "var(--border)",
                          opacity: 0.6
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--accent)";
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--foreground)";
                          e.currentTarget.style.opacity = "0.6";
                        }}
                      >
                        View
                      </button>
                      {subscription.is_active && (
                        <button
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setEditFormData({
                              customer_email: subscription.customer_email,
                              zendesk_subdomain: subscription.zendesk_subdomain,
                              start_date: subscription.start_date?.split("T")[0] || "",
                              end_date: subscription.end_date?.split("T")[0] || "",
                              tier_template: subscription.tier_template || "",
                              request_limit: subscription.request_limit,
                              main_llm: {
                                provider: subscription.main_llm.provider,
                                endpoint: subscription.main_llm.endpoint || "",
                                model: subscription.main_llm.model,
                                api_key: "",
                                input_price_per_million: subscription.main_llm.input_price_per_million ?? 0,
                                output_price_per_million: subscription.main_llm.output_price_per_million ?? 0,
                              },
                              fallback_llm: {
                                provider: subscription.fallback_llm.provider,
                                endpoint: subscription.fallback_llm.endpoint || "",
                                model: subscription.fallback_llm.model,
                                api_key: "",
                                input_price_per_million: subscription.fallback_llm.input_price_per_million ?? 0,
                                output_price_per_million: subscription.fallback_llm.output_price_per_million ?? 0,
                              },
                            });
                            setShowEditModal(true);
                          }}
                          className="px-3 py-1 text-xs border rounded transition-colors"
                          style={{ 
                            color: "var(--foreground)",
                            borderColor: "var(--border)",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--accent)";
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--foreground)";
                            e.currentTarget.style.opacity = "0.6";
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {canReactivateSubscription(subscription) && (
                        <button
                          onClick={() => {
                            setReactivateDialog({
                              isOpen: true,
                              subscriptionKey: subscription.subscription_key,
                              customerEmail: subscription.customer_email,
                            });
                          }}
                          disabled={reactivating === subscription.subscription_key}
                          className="px-3 py-1 text-xs border rounded transition-colors disabled:opacity-50"
                          style={{ 
                            color: "var(--foreground)",
                            borderColor: "var(--border)",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.color = "#ea580c";
                              e.currentTarget.style.opacity = "1";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.color = "var(--foreground)";
                              e.currentTarget.style.opacity = "0.6";
                            }
                          }}
                        >
                          {reactivating === subscription.subscription_key ? (
                            <FiRefreshCw className="text-sm animate-spin" />
                          ) : (
                            "Reactivate"
                          )}
                        </button>
                      )}
                      {subscription.is_active ? (
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              subscriptionKey: subscription.subscription_key,
                              customerEmail: subscription.customer_email,
                            });
                          }}
                          className="px-3 py-1 text-xs border rounded transition-colors"
                          style={{ 
                            color: "var(--foreground)",
                            borderColor: "var(--border)",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--accent)";
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--foreground)";
                            e.currentTarget.style.opacity = "0.6";
                          }}
                        >
                          Delete
                        </button>
                      ) : (
                        showInactive && (
                          <button
                            onClick={() => {
                              setPermanentDialog({
                                isOpen: true,
                                subscriptionKey: subscription.subscription_key,
                                customerEmail: subscription.customer_email,
                              });
                            }}
                            className="px-3 py-1 text-xs border rounded transition-colors"
                            style={{ 
                              color: "var(--foreground)",
                              borderColor: "var(--border)",
                              opacity: 0.6
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--accent)";
                              e.currentTarget.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--foreground)";
                              e.currentTarget.style.opacity = "0.6";
                            }}
                            title="Permanently delete subscription and all associated data"
                          >
                            Delete Permanently
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid grid-cols-4 gap-6">
                    {/* Customer */}
                    <div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {subscription.customer_email}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--foreground)", opacity: 0.7 }}
                      >
                        {subscription.zendesk_subdomain}
                      </div>
                    </div>

                    {/* Subscription */}
                    <div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {subscription.tier_template
                          ? subscription.tier_template
                              .charAt(0)
                              .toUpperCase() +
                            subscription.tier_template.slice(1)
                          : "Custom"}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--foreground)", opacity: 0.7 }}
                      >
                        {subscription.request_limit === -1
                          ? "Unlimited"
                          : `${subscription.request_limit.toLocaleString()} requests`}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--foreground)", opacity: 0.7 }}
                      >
                        Expires: {formatDate(subscription.end_date)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1">
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        {subscription.is_active ? "Active" : "Inactive"}
                      </span>
                      {canReactivateSubscription(subscription) && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          Can Reactivate
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={async () => {
                          setSelectedSubscription(subscription);
                          setUsageLoading(true);
                          setUsageError(null);
                          setShowViewModal(true);
                          requestAnimationFrame(() =>
                            setViewModalVisible(true)
                          );
                          try {
                            const usage =
                              await apiService.getSubscriptionUsage(
                                subscription.subscription_key
                              );
                            const usage_stats =
                              (
                                usage as {
                                  usage_stats?:
                                    | Subscription["usage_stats"]
                                    | Record<string, unknown>;
                                }
                              ).usage_stats || null;
                            setSelectedSubscription({
                              ...subscription,
                              usage_stats: usage_stats || undefined,
                            });
                          } catch (e) {
                            console.error("Failed to load usage stats", e);
                            setUsageError("Failed to load usage stats");
                          } finally {
                            setUsageLoading(false);
                          }
                        }}
                        className="flex items-center gap-1 text-left transition-colors"
                        style={{ 
                          color: "var(--foreground)",
                          opacity: 0.6
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--accent)";
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--foreground)";
                          e.currentTarget.style.opacity = "0.6";
                        }}
                      >
                        View
                      </button>
                      {subscription.is_active && (
                        <button
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setEditFormData({
                              customer_email: subscription.customer_email,
                              zendesk_subdomain:
                                subscription.zendesk_subdomain,
                              start_date:
                                subscription.start_date?.split("T")[0] || "",
                              end_date:
                                subscription.end_date?.split("T")[0] || "",
                              tier_template: subscription.tier_template || "",
                              request_limit: subscription.request_limit,
                              main_llm: {
                                provider: subscription.main_llm.provider,
                                endpoint:
                                  subscription.main_llm.endpoint || "",
                                model: subscription.main_llm.model,
                                api_key: "",
                                input_price_per_million:
                                  subscription.main_llm
                                    .input_price_per_million ?? 0,
                                output_price_per_million:
                                  subscription.main_llm
                                    .output_price_per_million ?? 0,
                              },
                              fallback_llm: {
                                provider: subscription.fallback_llm.provider,
                                endpoint:
                                  subscription.fallback_llm.endpoint || "",
                                model: subscription.fallback_llm.model,
                                api_key: "",
                                input_price_per_million:
                                  subscription.fallback_llm
                                    .input_price_per_million ?? 0,
                                output_price_per_million:
                                  subscription.fallback_llm
                                    .output_price_per_million ?? 0,
                              },
                            });
                            setShowEditModal(true);
                          }}
                          className="flex items-center gap-1 text-left transition-colors"
                          style={{ 
                            color: "var(--foreground)",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--accent)";
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--foreground)";
                            e.currentTarget.style.opacity = "0.6";
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {canReactivateSubscription(subscription) && (
                        <button
                          onClick={() => {
                            setReactivateDialog({
                              isOpen: true,
                              subscriptionKey: subscription.subscription_key,
                              customerEmail: subscription.customer_email,
                            });
                          }}
                          disabled={
                            reactivating === subscription.subscription_key
                          }
                          className="flex items-center gap-1 disabled:opacity-50 text-left transition-colors"
                          style={{ 
                            color: "var(--foreground)",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.color = "#ea580c";
                              e.currentTarget.style.opacity = "1";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.color = "var(--foreground)";
                              e.currentTarget.style.opacity = "0.6";
                            }
                          }}
                        >
                          {reactivating === subscription.subscription_key ? (
                            <FiRefreshCw className="text-sm animate-spin" />
                          ) : (
                            <FiRotateCcw className="text-sm" />
                          )}
                          Reactivate
                        </button>
                      )}
                      {subscription.is_active ? (
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              subscriptionKey: subscription.subscription_key,
                              customerEmail: subscription.customer_email,
                            });
                          }}
                          className="flex items-center gap-1 text-left transition-colors"
                          style={{ 
                            color: "var(--foreground)",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--accent)";
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--foreground)";
                            e.currentTarget.style.opacity = "0.6";
                          }}
                        >
                          Delete
                        </button>
                      ) : (
                        showInactive && (
                          <button
                            onClick={() => {
                              setPermanentDialog({
                                isOpen: true,
                                subscriptionKey:
                                  subscription.subscription_key,
                                customerEmail: subscription.customer_email,
                              });
                            }}
                            className="flex items-center gap-1 text-left transition-colors"
                            style={{ 
                              color: "var(--foreground)",
                              opacity: 0.6
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--accent)";
                              e.currentTarget.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--foreground)";
                              e.currentTarget.style.opacity = "0.6";
                            }}
                            title="Permanently delete subscription and all associated data"
                          >
                            Delete Permanently
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No subscriptions found</p>
          </div>
        )}

        {/* Pagination */}
        {subscriptions.length > 0 && !searchTerm && (
          <div className="flex items-center justify-between gap-3 mt-4">
            <div
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Page {currentPage} of {totalPages} ({totalCount} total subscriptions)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const newPage = Math.max(1, currentPage - 1);
                  setCurrentPage(newPage);
                  await fetchSubscriptionsWithValue(showInactive, false, newPage);
                }}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                Previous
              </button>
              <span className="text-sm" style={{ color: "var(--foreground)" }}>
                Page {currentPage}
              </span>
              <button
                onClick={async () => {
                  const newPage = currentPage + 1;
                  setCurrentPage(newPage);
                  await fetchSubscriptionsWithValue(showInactive, false, newPage);
                }}
                disabled={subscriptions.length < pageSize}
                className="px-3 py-1 rounded border disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create Subscription Modal */}
        {showCreateForm && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "var(--modal-overlay)" }}
          >
            <div
              className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto themed-scroll"
              style={{ background: "var(--card-bg)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  Create New Subscription
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <form onSubmit={handleCreateSubscription} className="space-y-6">
                {/* Tier Template Selection */}
                <TierTemplateSelector
                  selectedTemplate={formData.tier_template}
                  onTemplateSelect={handleTierTemplateSelect}
                />

                {/* Basic Information */}
                <div className="admin-card p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Email *
                      </label>
                      <input
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customer_email: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="customer@company.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zendesk Subdomain *
                      </label>
                      <input
                        type="text"
                        value={formData.zendesk_subdomain}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            zendesk_subdomain: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="company"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Limit
                      </label>
                      <input
                        type="number"
                        value={formData.request_limit}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            request_limit: parseInt(e.target.value) || 1000,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="1000"
                        min="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Set to -1 for unlimited requests
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date Range Selection */}
                <DateRangePicker
                  startDate={formData.start_date}
                  endDate={formData.end_date}
                  onChange={handleDateRangeChange}
                />

                {/* Main LLM Configuration */}
                <div className="admin-card p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Main LLM Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider *
                      </label>
                      <ThemedSelect
                        value={formData.main_llm.provider}
                        onChange={(provider) =>
                          handleProviderChange("main_llm", provider)
                        }
                        options={Object.entries(providers).map(
                          ([key, provider]) => ({
                            value: key,
                            label: provider.name as string,
                          })
                        )}
                        placeholder="Select Provider"
                        className="w-full"
                        ariaLabel="Main LLM Provider"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={formData.main_llm.model}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              model: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter model name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key *
                      </label>
                      <input
                        type="password"
                        value={formData.main_llm.api_key}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              api_key: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter API key"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endpoint
                      </label>
                      <input
                        type="url"
                        value={formData.main_llm.endpoint}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              endpoint: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="API endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.main_llm.input_price_per_million}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              input_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million input tokens
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Output Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.main_llm.output_price_per_million}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              output_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million output tokens
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fallback LLM Configuration */}
                <div className="admin-card p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Fallback LLM Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider *
                      </label>
                      <ThemedSelect
                        value={formData.fallback_llm.provider}
                        onChange={(provider) =>
                          handleProviderChange("fallback_llm", provider)
                        }
                        options={Object.entries(providers).map(
                          ([key, provider]) => ({
                            value: key,
                            label: provider.name as string,
                          })
                        )}
                        placeholder="Select Provider"
                        className="w-full"
                        ariaLabel="Fallback LLM Provider"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={formData.fallback_llm.model}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              model: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter model name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key *
                      </label>
                      <input
                        type="password"
                        value={formData.fallback_llm.api_key}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              api_key: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter API key"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endpoint
                      </label>
                      <input
                        type="url"
                        value={formData.fallback_llm.endpoint}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              endpoint: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="API endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.fallback_llm.input_price_per_million}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              input_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million input tokens
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Output Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.fallback_llm.output_price_per_million}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              output_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million output tokens
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="admin-button-outline px-6 py-2 rounded-lg flex items-center gap-2"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-button px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>Create Subscription</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Subscription Modal */}
        {showViewModal && selectedSubscription && (
          <div
            className={`fixed inset-0 z-[60] p-4 flex items-center justify-center transition-opacity duration-200 ${
              viewModalVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ background: "var(--modal-overlay)" }}
          >
            <div
              className={`rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto themed-scroll transform transition-transform duration-200 will-change-auto ${
                viewModalVisible ? "scale-100" : "scale-95"
              }`}
              style={{ background: "var(--card-bg)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Subscription Details</h2>
                <button
                  onClick={() => {
                    setViewModalVisible(false);
                    setTimeout(() => {
                      setShowViewModal(false);
                      setSelectedSubscription(null);
                    }, 180);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                  title="Close"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {usageLoading && (
                <div className="space-y-4 animate-pulse">
                  {/* Customer info skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="admin-card p-4">
                      <div className="h-5 w-40 rounded skeleton-block" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 w-56 rounded skeleton-block" />
                        <div className="h-4 w-40 rounded skeleton-block" />
                        <div className="h-3 w-32 rounded skeleton-block" />
                      </div>
                    </div>
                    <div className="admin-card p-4">
                      <div className="h-5 w-48 rounded skeleton-block" />
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div
                          className="h-4 w-24 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-4 w-28 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-4 w-32 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-4 w-20 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* LLM cards skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="admin-card p-4">
                      <div className="h-5 w-32 rounded skeleton-block" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 w-36 rounded skeleton-block" />
                        <div className="h-4 w-24 rounded skeleton-block" />
                      </div>
                    </div>
                    <div className="admin-card p-4">
                      <div className="h-5 w-36 rounded skeleton-block" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 w-40 rounded skeleton-block" />
                        <div className="h-4 w-28 rounded skeleton-block" />
                      </div>
                    </div>
                  </div>
                  {/* Usage skeleton */}
                  <div className="admin-card p-4">
                    <div className="h-5 w-44 rounded skeleton-block" />
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div
                          className="h-4 w-32 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-3 w-24 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-3 w-20 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                      </div>
                      <div className="space-y-2">
                        <div
                          className="h-4 w-36 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-3 w-24 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                        <div
                          className="h-3 w-20 rounded"
                          style={{ background: "var(--accent)", opacity: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {usageError && (
                <div className="mb-4 text-sm text-red-600">{usageError}</div>
              )}

              {!usageLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="admin-card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Customer Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <span>{selectedSubscription.customer_email}</span>
                        <button
                          type="button"
                          className="inline-flex items-center p-1 cursor-pointer"
                          style={{
                            color: "var(--foreground)",
                            background: "transparent",
                          }}
                          aria-label="Copy email"
                          title="Copy email"
                          onClick={() =>
                            handleCopy(
                              "email",
                              selectedSubscription.customer_email
                            )
                          }
                        >
                          {copiedField === "email" ? (
                            <IoMdCheckmark />
                          ) : (
                            <MdOutlineContentCopy />
                          )}
                        </button>
                      </div>
                      <div>
                        <span className="font-medium">Subdomain:</span>{" "}
                        {selectedSubscription.zendesk_subdomain}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Subscription Key:</span>
                        <span className="text-xs">
                          {selectedSubscription.subscription_key}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center p-1 cursor-pointer"
                          style={{
                            color: "var(--foreground)",
                            background: "transparent",
                          }}
                          aria-label="Copy subscription key"
                          title="Copy subscription key"
                          onClick={() =>
                            handleCopy(
                              "subkey",
                              selectedSubscription.subscription_key
                            )
                          }
                        >
                          {copiedField === "subkey" ? (
                            <IoMdCheckmark />
                          ) : (
                            <MdOutlineContentCopy />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Subscription Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Tier:</span>{" "}
                        {selectedSubscription.tier_template || "Custom"}
                      </div>
                      <div>
                        <span className="font-medium">Start Date:</span>{" "}
                        {formatDate(selectedSubscription.start_date)}
                      </div>
                      <div>
                        <span className="font-medium">End Date:</span>{" "}
                        {formatDate(selectedSubscription.end_date)}
                      </div>
                      <div>
                        <span className="font-medium">Request Limit:</span>{" "}
                        {selectedSubscription.request_limit === -1
                          ? "Unlimited"
                          : selectedSubscription.request_limit.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Current Usage:</span>{" "}
                        {selectedSubscription.current_usage.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span
                          className="ml-2 text-xs font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          {selectedSubscription.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Main LLM</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Provider:</span>{" "}
                        {selectedSubscription.main_llm.provider}
                      </div>
                      <div>
                        <span className="font-medium">Model:</span>{" "}
                        {selectedSubscription.main_llm.model}
                      </div>
                    </div>
                  </div>

                  <div className="admin-card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Fallback LLM
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Provider:</span>{" "}
                        {selectedSubscription.fallback_llm.provider}
                      </div>
                      <div>
                        <span className="font-medium">Model:</span>{" "}
                        {selectedSubscription.fallback_llm.model}
                      </div>
                    </div>
                  </div>

                  {!usageLoading && (
                    <div className="admin-card p-4 md:col-span-2">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Usage Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Main LLM Usage</div>
                          <div>
                            Requests:{" "}
                            {selectedSubscription.usage_stats?.main_llm_usage?.total_requests?.toLocaleString() ||
                              "0"}
                          </div>
                          <div>
                            Cost: $
                            {(
                              selectedSubscription.usage_stats?.main_llm_usage
                                ?.estimated_cost_usd || 0
                            ).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Fallback LLM Usage</div>
                          <div>
                            Requests:{" "}
                            {selectedSubscription.usage_stats?.fallback_llm_usage?.total_requests?.toLocaleString() ||
                              "0"}
                          </div>
                          <div>
                            Cost: $
                            {(
                              selectedSubscription.usage_stats
                                ?.fallback_llm_usage?.estimated_cost_usd || 0
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Subscription Modal */}
        {showEditModal && selectedSubscription && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "var(--modal-overlay)" }}
          >
            <div
              className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto themed-scroll"
              style={{ background: "var(--card-bg)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Edit Subscription</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSubscription(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <form onSubmit={handleUpdateSubscription} className="space-y-6">
                {/* Basic Information */}
                <div className="admin-card p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Email
                      </label>
                      <input
                        type="email"
                        value={editFormData.customer_email}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            customer_email: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zendesk Subdomain
                      </label>
                      <input
                        type="text"
                        value={editFormData.zendesk_subdomain}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            zendesk_subdomain: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editFormData.start_date}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            start_date: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={editFormData.end_date}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            end_date: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Limit
                      </label>
                      <input
                        type="number"
                        value={editFormData.request_limit}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            request_limit: parseInt(e.target.value) || 1000,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Main LLM Configuration */}
                <div className="admin-card p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Main LLM Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider *
                      </label>
                      <ThemedSelect
                        value={editFormData.main_llm.provider}
                        onChange={(provider) => {
                          if (provider && providers[provider]) {
                            const providerData = providers[provider] as Record<
                              string,
                              unknown
                            >;
                            const endpoint =
                              (providerData.endpoint as string) || "";
                            const models =
                              (providerData.example_models as string[]) || [];
                            const pricing =
                              (providerData.default_pricing as Record<
                                string,
                                { input: number; output: number }
                              >) || {};
                            const firstModel = models[0] || "";
                            const firstPricing =
                              firstModel && pricing[firstModel]
                                ? pricing[firstModel]
                                : { input: 0, output: 0 };
                            setEditFormData((prev) => ({
                              ...prev,
                              main_llm: {
                                ...prev.main_llm,
                                provider,
                                endpoint,
                                model: firstModel,
                                api_key: "",
                                input_price_per_million:
                                  firstPricing.input || 0,
                                output_price_per_million:
                                  firstPricing.output || 0,
                              },
                            }));
                          } else {
                            setEditFormData((prev) => ({
                              ...prev,
                              main_llm: { ...prev.main_llm, provider },
                            }));
                          }
                        }}
                        options={Object.entries(providers).map(
                          ([key, prov]) => ({
                            value: key,
                            label: prov.name as string,
                          })
                        )}
                        placeholder="Select Provider"
                        className="w-full"
                        ariaLabel="Main LLM Provider"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={editFormData.main_llm.model}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              model: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter model name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key *
                      </label>
                      <input
                        type="password"
                        value={editFormData.main_llm.api_key}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              api_key: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter API key"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endpoint
                      </label>
                      <input
                        type="url"
                        value={editFormData.main_llm.endpoint}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              endpoint: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="API endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editFormData.main_llm.input_price_per_million}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              input_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million input tokens
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Output Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editFormData.main_llm.output_price_per_million}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            main_llm: {
                              ...prev.main_llm,
                              output_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million output tokens
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fallback LLM Configuration */}
                <div className="admin-card p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Fallback LLM Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider *
                      </label>
                      <ThemedSelect
                        value={editFormData.fallback_llm.provider}
                        onChange={(provider) => {
                          if (provider && providers[provider]) {
                            const providerData = providers[provider] as Record<
                              string,
                              unknown
                            >;
                            const endpoint =
                              (providerData.endpoint as string) || "";
                            const models =
                              (providerData.example_models as string[]) || [];
                            const pricing =
                              (providerData.default_pricing as Record<
                                string,
                                { input: number; output: number }
                              >) || {};
                            const firstModel = models[0] || "";
                            const firstPricing =
                              firstModel && pricing[firstModel]
                                ? pricing[firstModel]
                                : { input: 0, output: 0 };
                            setEditFormData((prev) => ({
                              ...prev,
                              fallback_llm: {
                                ...prev.fallback_llm,
                                provider,
                                endpoint,
                                model: firstModel,
                                api_key: "",
                                input_price_per_million:
                                  firstPricing.input || 0,
                                output_price_per_million:
                                  firstPricing.output || 0,
                              },
                            }));
                          } else {
                            setEditFormData((prev) => ({
                              ...prev,
                              fallback_llm: { ...prev.fallback_llm, provider },
                            }));
                          }
                        }}
                        options={Object.entries(providers).map(
                          ([key, prov]) => ({
                            value: key,
                            label: prov.name as string,
                          })
                        )}
                        placeholder="Select Provider"
                        className="w-full"
                        ariaLabel="Fallback LLM Provider"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={editFormData.fallback_llm.model}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              model: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter model name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key *
                      </label>
                      <input
                        type="password"
                        value={editFormData.fallback_llm.api_key}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              api_key: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Enter API key"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endpoint
                      </label>
                      <input
                        type="url"
                        value={editFormData.fallback_llm.endpoint}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              endpoint: e.target.value,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="API endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          editFormData.fallback_llm.input_price_per_million
                        }
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              input_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million input tokens
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Output Price per Million Tokens ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          editFormData.fallback_llm.output_price_per_million
                        }
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            fallback_llm: {
                              ...prev.fallback_llm,
                              output_price_per_million:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cost per 1 million output tokens
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedSubscription(null);
                    }}
                    className="admin-button-outline px-6 py-2 rounded-lg flex items-center gap-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-button px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      <>Update Subscription</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Delete Subscription"
          message={`Are you sure you want to delete the subscription for ${confirmDialog.customerEmail}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteSubscription}
          onCancel={() =>
            setConfirmDialog({
              isOpen: false,
              subscriptionKey: "",
              customerEmail: "",
            })
          }
          type="danger"
        />

        {/* Reactivate Confirmation Dialog */}
        <ConfirmDialog
          isOpen={reactivateDialog.isOpen}
          title="Reactivate Subscription"
          message={`Are you sure you want to reactivate the subscription for ${reactivateDialog.customerEmail}? This will make the subscription active again until its expiration date.`}
          confirmText="Reactivate"
          cancelText="Cancel"
          type="success"
          onConfirm={handleReactivateSubscription}
          onCancel={() =>
            setReactivateDialog({
              isOpen: false,
              subscriptionKey: "",
              customerEmail: "",
            })
          }
        />

        {/* Permanent Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={permanentDialog.isOpen}
          title="Permanently Delete Subscription"
          message={`This will permanently delete the subscription for ${permanentDialog.customerEmail} and remove all associated data, including macros, usage, features, telemetry, and user sessions. This action cannot be undone. Continue?`}
          confirmText="Delete Permanently"
          cancelText="Cancel"
          type="danger"
          onConfirm={handlePermanentDelete}
          onCancel={() =>
            setPermanentDialog({
              isOpen: false,
              subscriptionKey: "",
              customerEmail: "",
            })
          }
        />
      </div>
    </AdminLayout>
  );
}
