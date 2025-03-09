export interface FlutterVirtualAccountRequest {
  email: string
  userAddress: string
  name: string
}

export interface  FlutterResponse<T> {
  status: string
  message: string
  data: T
}

export interface FlutterVirtualAccountResponseData {
  response_code: string
  response_message: string
  order_ref: string
  account_number: string
  bank_name: string
}

export interface FlutterVirtualAccountResponse extends FlutterResponse<FlutterVirtualAccountResponseData> {}

export interface FlutterTransactionResponse {
  status: string;
  message: string;
  meta: {
    page_info: {
      total: number;
      current_page: number;
      total_pages: number;
    };
  };
  data: FlutterTransaction[];
};

export interface FlutterTransaction {
  id: string;
  tx_ref: string;
  flw_ref: string;
  device_fingerprint: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number | null;
  merchant_fee: number;
  processor_response: string | null;
  auth_model: string;
  ip: string;
  narration: string;
  status: string;
  payment_type: string;
  created_at: string;
  amount_settled: number | null;
  account: {
    nuban: string;
    bank: string;
  };
  customer_name: string;
  customer_email: string;
  account_id: string;
};

