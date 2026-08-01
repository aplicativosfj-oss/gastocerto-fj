import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/api/public/mercadopago')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const topic = url.searchParams.get('topic') || url.searchParams.get('type')
          const id = url.searchParams.get('id') || url.searchParams.get('data.id')

          // Se for um teste de webhook (sem ID)
          if (!id) return new Response('ok')

          // Somente processamos pagamentos (payment)
          if (topic === 'payment' || topic === 'merchant_order') {
             const { processMercadoPagoWebhook } = await import('@/lib/mercadopago-webhook.server')
             await processMercadoPagoWebhook(id, topic)
          }

          return new Response('ok')
        } catch (error) {
          console.error('[MercadoPago Webhook Error]:', error)
          return new Response('Webhook Error', { status: 500 })
        }
      }
    }
  }
})
