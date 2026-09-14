// src/store/StoreProvider.js
'use client'

import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { store } from './store'

export default function StoreProvider({ children }) {
  // Create a query client once per session
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes cache by default
        refetchOnWindowFocus: false, // Prevents aggressive refetching when switching tabs
        retry: 1 // Retry only once on failure to keep UI snappy
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        {children}
      </Provider>
    </QueryClientProvider>
  )
}
