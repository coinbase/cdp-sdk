import { CdpClient, SpendPermission } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import "dotenv/config";

const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgWG6tpSA/3fybKcyymkoYYoHqzq39zbAnTF0wktp3RsuhRANCAASh4if4N4XWTZQliCBuqtkhmKP3L2XmYY97x9+F2IjZrgq9ylkwSPsUomFxdQfrLEgEcWDkbH4BToalfA6VRw0m",  
  basePath: "http://localhost:8002",
  debugging: true,
});

const owner = await cdp.evm.getOrCreateAccount({
    name: "MyOwner",
  });
  
const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: "MySmartAccount",
    owner,
    __experimental_enableSpendPermission: true,
});

const revokeUserOperationResult = await cdp.evm.revokeSpendPermission({
  account: smartAccount.address,
  permissionHash: "0xc681bd9cd0f65302746e1d16d1f1902ea08b5ef7f6f229702658b27e0991b089",
  network: "base-sepolia",
});

const revokeUserOperationReceipt = await cdp.evm.waitForUserOperation({
  smartAccountAddress: smartAccount.address,
  userOpHash: revokeUserOperationResult.userOpHash,
});

console.log("Revoke User Operation:", revokeUserOperationReceipt);