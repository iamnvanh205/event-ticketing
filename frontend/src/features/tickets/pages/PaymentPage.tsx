import { CreditCard } from 'lucide-react'
import { PageState } from '../../../components/ui/feedback'

export function PaymentPage() {
  return (
    <section className="page">
      <PageState
        title="Payment is not required"
        description="The current MVP confirms reservations without a payment provider. No charge has been made."
        action={<a className="outline-action" href="/tickets"><CreditCard aria-hidden="true" size={18} />Return to My Tickets</a>}
      />
    </section>
  )
}
