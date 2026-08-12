import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    let clearTimer

    function handleOnline() {
      setOnline(true)
      setWasOffline(true)
      clearTimer = setTimeout(() => setWasOffline(false), 3000)
    }
    function handleOffline() {
      setOnline(false)
      setWasOffline(false)
      clearTimeout(clearTimer)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(clearTimer)
    }
  }, [])

  return { online, wasOffline }
}
