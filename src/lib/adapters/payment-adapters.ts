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

abstract class DisabledPilotPaymentAdapter implements PaymentAdapter {
  abstract name: string;

  async isEnabled(): Promise<boolean> {
    return false;
  }

  async initiatePayment(
    amountMwk: number,
    phoneNumber: string,
    narration: string
  ): Promise<PaymentAdapterResult> {
    void amountMwk;
    void phoneNumber;
    void narration;
    return {
      ok: false,
      message: `${this.name} processing is unavailable during the non-custodial pilot. Record externally completed payments in the ledger instead.`,
      transactionStatus: "failed",
    };
  }

  async verifyTransaction(referenceId: string): Promise<PaymentAdapterResult> {
    void referenceId;
    return {
      ok: false,
      message: `${this.name} processing is unavailable during the non-custodial pilot.`,
      transactionStatus: "failed",
    };
  }
}

export class AirtelMoneyAdapter extends DisabledPilotPaymentAdapter {
  name = "Airtel Money";
}

export class TnmMpambaAdapter extends DisabledPilotPaymentAdapter {
  name = "TNM Mpamba";
}

export class DzalekaPayAdapter extends DisabledPilotPaymentAdapter {
  name = "DzalekaPay";
}
