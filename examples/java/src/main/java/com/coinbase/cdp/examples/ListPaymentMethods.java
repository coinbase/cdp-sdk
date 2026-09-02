package com.coinbase.cdp.examples;


/** Lists flexible custody payment methods with the generated Java SDK. */
public final class ListPaymentMethods {
  private ListPaymentMethods() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var paymentMethods = CdpClientFactory.create().paymentMethods().listPaymentMethods();
    System.out.println("Payment methods: " + paymentMethods);
  }
}
