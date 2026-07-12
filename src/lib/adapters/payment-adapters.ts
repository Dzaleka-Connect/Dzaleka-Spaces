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

export class DzalekaPayAdapter implements PaymentAdapter {
  name = "DzalekaPay";

  async isEnabled(): Promise<boolean> {
    // Processing remains locked off. Only server-side transaction reads are supported.
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
      message:
        "DzalekaPay initiation is unavailable during the non-custodial pilot. Record an externally completed transaction instead.",
      transactionStatus: "failed",
    };
  }

  async verifyTransaction(referenceId: string): Promise<PaymentAdapterResult> {
    try {
      const { dzalekaPayReconciliationEnabled, getDzalekaPayTransaction } =
        await import("@/lib/dzalekapay/server");
      if (!dzalekaPayReconciliationEnabled()) {
        return {
          ok: false,
          message: "DzalekaPay reconciliation is not enabled.",
          transactionStatus: "failed",
        };
      }
      const transaction = await getDzalekaPayTransaction(referenceId);
      return {
        ok: transaction.status === "completed",
        message: `DzalekaPay reports this transaction as ${transaction.status}.`,
        referenceId: transaction.id,
        transactionStatus:
          transaction.status === "completed"
            ? "success"
            : transaction.status === "pending"
              ? "pending"
              : "failed",
      };
    } catch {
      return {
        ok: false,
        message: "DzalekaPay could not verify this transaction right now.",
        transactionStatus: "failed",
      };
    }
  }
}
