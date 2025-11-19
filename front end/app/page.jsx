'use client'

import { useState } from 'react'
import SplashScreen from '@/components/SplashScreen'
import MapRoutePage from '@/components/MapRoutePage'

export default function HomePage() {
  const [view, setView] = useState('splash')

  if (view === 'map') {
    return <MapRoutePage onBackToSplash={() => setView('splash')} />
  }

  return (
    <SplashScreen
      onLogin={() => setView('map')}
      onGuest={() => setView('map')}
      onStart={() => setView('map')}
    />
  )
}
