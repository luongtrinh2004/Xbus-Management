/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react'

// Removed TypeScript type definitions since JavaScript doesn't use them
function useAsync(callback, deps = []) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(undefined)
  const [value, setValue] = useState(undefined)

  const callbackMemoized = useCallback(() => {
    setLoading(true)
    setError(undefined)
    setValue(undefined)

    callback()
      .then(setValue)
      .catch(err => setError(err.message || 'Unknown error'))
      .finally(() => setLoading(false))
  }, deps)

  useEffect(() => {
    callbackMemoized()
  }, [callbackMemoized])

  return { loading, error, value }
}

export default useAsync
