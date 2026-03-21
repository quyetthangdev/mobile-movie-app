/**
 * CartContent — dùng chung Tab Cart và Menu stack cart (`menu/cart`).
 * Phase 1: CartContentPhase1 — Phase 2: CartContentFull sau transition.
 */
import { useRunAfterTransition } from '@/hooks'
import { consumeFromProductDetail } from '@/lib/navigation'
import React, { useState } from 'react'

import { CartContentFull } from '@/components/cart/cart-content-full'
import { CartContentPhase1 } from '@/components/cart/cart-content-phase1'

export type CartContentProps = {
  onBack: () => void
  onBackToMenu: () => void
}

export function CartContent({ onBack, onBackToMenu }: CartContentProps) {
  const [phase2Ready, setPhase2Ready] = useState(false)

  consumeFromProductDetail()

  useRunAfterTransition(() => setPhase2Ready(true), [], {
    androidDelayMs: 150,
  })

  if (!phase2Ready) {
    return <CartContentPhase1 onBack={onBack} onBackToMenu={onBackToMenu} />
  }

  return (
    <CartContentFull onBack={onBack} onBackToMenu={onBackToMenu} />
  )
}
