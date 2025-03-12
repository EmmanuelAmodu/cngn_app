export interface PaystackCreateCustomerRequest {
  email: string
  firstName: string
  lastName: string
  phone: string
}

export interface PaystackCreateCustomerResponse {
  status: boolean
  message: string
  data: {
    email: string
    domain: string
    customer_code: string
    id: number
  }
}

export interface PaystackCreateCustomerVirtualAccountResponse {
  status: boolean;
  message: string;
  data: {
    bank: {
      name: string;
      id: number;
      slug: string;
    };
    account_name: string;
    account_number: string;
    assigned: boolean;
    currency: string;
    active: boolean;
    id: number;
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
    assignment: {
      integration: number;
      assignee_id: number;
      assignee_type: string;
      expired: boolean;
      account_type: string;
      assigned_at: string; // ISO date string
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      risk_action: string;
    };
  };
};

export interface PaystackBank {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
};

export interface PaystackBanksResponse {
  status: boolean;
  message: string;
  data: PaystackBank[];
  meta: {
    next: string | null;
    previous: string | null;
    perPage: number;
  };
};

export interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: PaystackTransaction[];
  meta: {
    next: string | null;
    previous: string | null;
    perPage: number;
  };
};

export interface PaystackTransaction {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  log: PaystackTransactionLog;
  fees: number;
  customer: PaystackCustomer;
  authorization: PaystackAuthorization;
  order_id: string | null;
  paidAt: string;
  createdAt: string;
  requested_amount: number;
  source: PaystackTransactionSource;
};

export interface PaystackTransactionLog {
  start_time: number;
  time_spent: number;
  attempts: number;
  errors: number;
  success: boolean;
  mobile: boolean;
  history: PaystackLogHistory[];
};

export interface PaystackLogHistory {
  type: string;
  message: string;
  time: number;
};

export interface PaystackCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  metadata: {
    custom_fields: PaystackCustomField[];
  };
  customer_code: string;
  risk_action: string;
};

export interface PaystackCustomField {
  display_name: string;
  variable_name: string;
  value: string;
};

export interface PaystackAuthorization {
  authorization_code: string;
  bin: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  card_type: string;
  bank: string;
  country_code: string;
  brand: string;
  reusable: boolean;
  signature: string;
  account_name: string | null;
};

export interface PaystackTransactionSource {
  source: string;
  type: string;
  identifier: string | null;
  entry_point: string;
};
