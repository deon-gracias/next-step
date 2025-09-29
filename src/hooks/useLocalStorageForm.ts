// hooks/useLocalStorageForm.ts
import { useCallback } from 'react';

export function useLocalStorageForm<T extends Record<string, any>>(
  storageKey: string
) {
  // Save form data to localStorage
  const saveToStorage = useCallback((data: T) => {
    try {
      // Handle Date objects in the data
      const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));

      localStorage.setItem(storageKey, JSON.stringify({
        ...serializedData,
        _timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error);
    }
  }, [storageKey]);

  // Load form data from localStorage
  const loadFromStorage = useCallback((): Partial<T> | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        
        // Convert ISO strings back to Date objects
        Object.keys(parsedData).forEach(key => {
          const value = parsedData[key];
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                parsedData[key] = date;
              }
            } catch (e) {
              // Keep original value
            }
          }
        });
        
        // Remove timestamp
        const { _timestamp, ...formData } = parsedData;
        return formData;
      }
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error);
    }
    return null;
  }, [storageKey]);

  // Clear storage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, [storageKey]);

  return {
    clearStorage,
    loadFromStorage,
    saveToStorage
  };
}
