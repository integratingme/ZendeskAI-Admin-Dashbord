'use client';

import { useState } from 'react';
import ThemedSelect from '@/components/ThemedSelect';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  className?: string;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState('custom');

  const handlePresetChange = (presetValue: string) => {
    setPreset(presetValue);
    
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    switch (presetValue) {
      case '30':
        end.setDate(now.getDate() + 30);
        break;
      case '90':
        end.setDate(now.getDate() + 90);
        break;
      case '365':
        end.setDate(now.getDate() + 365);
        break;
      case 'custom':
        return; // Don't change dates for custom
      default:
        return;
    }
    
    onChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  };

  const handleStartDateChange = (newStartDate: string) => {
    setPreset('custom');
    onChange(newStartDate, endDate);
  };

  const handleEndDateChange = (newEndDate: string) => {
    setPreset('custom');
    onChange(startDate, newEndDate);
  };

  const formatDateForDisplay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDuration = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="admin-card p-4">
      <h3 className="font-medium text-gray-900 mb-4">Subscription Period</h3>
      
      <div className="space-y-4">
        {/* Preset Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Presets
          </label>
          <ThemedSelect
            value={preset}
            onChange={(val) => handlePresetChange(val)}
            options={[
              { value: '30', label: '30 Days' },
              { value: '90', label: '90 Days' },
              { value: '365', label: '1 Year' },
              { value: 'custom', label: 'Custom Range' },
            ]}
            placeholder="Select preset"
            ariaLabel="Quick Presets"
            className="w-full"
          />
        </div>

        {/* Custom Date Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={startDate}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>

        {/* Duration Display */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-sm text-gray-700">
            <strong>Duration:</strong> {getDuration()} days
          </div>
          <div className="text-sm text-gray-700">
            <strong>From:</strong> {formatDateForDisplay(startDate)} <strong>To:</strong> {formatDateForDisplay(endDate)}
          </div>
        </div>

        {/* Validation */}
        {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">
              End date must be after start date
            </p>
          </div>
        )}
      </div>
    </div>
  );
}