export interface NumeroVirtualAccountRequest {
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
  bvn: string
}

export interface NumeroVirtualAccountResponse {
  status: boolean
  message: string
  data: {
    reference: string
    accountName: string
    accountNumber: string
    bankName: string
  }
}

export interface VirtualAccountDetails {
  reference: string
  accountName: string
  accountNumber: string
  bankName: string
}

export interface WebhookRequest {
  id: string
  event: string
  created_at: string
  data: {
    transaction_id: string
    amount: string
    currency: string
    status: string
    customer_id: string
    description: string
  }
  signature: string
}
