export interface NumeroVirtualAccountRequest {
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
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

