import { featureEnabled } from "../features";

export interface PaymentAdapterResult {
  ok: boolean;
  message: string;
  referenceId?: string;
  transactionStatus?: "pending" | "success" | "failed";
}

export interface PaymentAdapter {
  name: string;
  isEnabled(): Promise<boolean>;
  initiatePayment(
    amountMwk: number,
    phoneNumber: string,
    narration: string
  ): Promise<PaymentAdapterResult>;
  verifyTransaction(referenceId: string): Promise<PaymentAdapterResult>;
}

export class AirtelMoneyAdapter implements PaymentAdapter {
  name = "Airtel Money";

  async isEnabled(): Promise<boolean> {
    return await featureEnabled("mobile_money_integrations");
  }

  async initiatePayment(
    amountMwk: number,
    phoneNumber: string,
    narration: string
  ): Promise<PaymentAdapterResult> {
    if (!(await this.isEnabled())) {
      return {
        ok: false,
        message: "Airtel Money integration is disabled during the pilot (ledger-only).",
        transactionStatus: "failed",
      };
    }
    // Sandbox / Mock logic if enabled (otherwise disabled)
    return {
      ok: true,
      message: "Payment initiated.",
      referenceId: `airtel-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      transactionStatus: "pending",
    };
  }

  async verifyTransaction(referenceId: string): Promise<PaymentAdapterResult> {
    if (!(await this.isEnabled())) {
      return {
        ok: false,
        message: "Integration disabled.",
        transactionStatus: "failed",
      };
    }
    return {
      ok: true,
      message: "Transaction verified successfully.",
      transactionStatus: "success",
    };
  }
}

export class TnmMpambaAdapter implements PaymentAdapter {
  name = "TNM Mpamba";

  async isEnabled(): Promise<boolean> {
    return await featureEnabled("mobile_money_integrations");
  }

  async initiatePayment(
    amountMwk: number,
    phoneNumber: string,
    narration: string
  ): Promise<PaymentAdapterResult> {
    if (!(await this.isEnabled())) {
      return {
        ok: false,
        message: "TNM Mpamba integration is disabled during the pilot (ledger-only).",
        transactionStatus: "failed",
      };
    }
    return {
      ok: true,
      message: "Payment initiated.",
      referenceId: `mpamba-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      transactionStatus: "pending",
    };
  }

  async verifyTransaction(referenceId: string): Promise<PaymentAdapterResult> {
    if (!(await this.isEnabled())) {
      return {
        ok: false,
        message: "Integration disabled.",
        transactionStatus: "failed",
      };
    }
    return {
      ok: true,
      message: "Transaction verified successfully.",
      transactionStatus: "success",
    };
  }
}

export class DzalekaPayAdapter implements PaymentAdapter {
  name = "DzalekaPay";

  async isEnabled(): Promise<boolean> {
    return await featureEnabled("payment_processing");
  }

  async initiatePayment(
    amountMwk: number,
    phoneNumber: string,
    narration: string
  ): Promise<PaymentAdapterResult> {
    if (!(await this.isEnabled())) {
      return {
        ok: false,
        message: "DzalekaPay integration is disabled during the pilot (ledger-only).",
        transactionStatus: "failed",
      };
    }
    return {
      ok: true,
      message: "Payment initiated.",
      referenceId: `dzpay-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      transactionStatus: "pending",
    };
  }

  async verifyTransaction(referenceId: string): Promise<PaymentAdapterResult> {
    if (!(await this.isEnabled())) {
      return {
        ok: false,
        message: "Integration disabled.",
        transactionStatus: "failed",
      };
    }
    return {
      ok: true,
      message: "Transaction verified successfully.",
      transactionStatus: "success",
    };
  }
}
