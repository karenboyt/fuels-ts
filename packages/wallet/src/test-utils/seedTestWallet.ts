import { randomBytes } from '@fuel-ts/crypto';
import { coinQuantityfy, ScriptTransactionRequest } from '@fuel-ts/providers';
import type { CoinQuantityLike } from '@fuel-ts/providers';

import type { Account } from '../account';
import { WalletUnlocked } from '../wallets';

export const seedTestWallet = async (wallet: Account, quantities: CoinQuantityLike[]) => {
  const genesisWallet = new WalletUnlocked(
    process.env.GENESIS_SECRET || randomBytes(32),
    wallet.provider
  );

  // Connect to the same Provider as wallet
  const resources = await genesisWallet.getResourcesToSpend(quantities);

  const { minGasPrice } = genesisWallet.provider.getGasConfig();

  // Create transaction
  const request = new ScriptTransactionRequest({
    gasLimit: 10000,
    gasPrice: minGasPrice,
  });

  request.addResources(resources);

  quantities
    .map(coinQuantityfy)
    .forEach(({ amount, assetId }) => request.addCoinOutput(wallet.address, amount, assetId));
  await genesisWallet.sendTransaction(request, { awaitExecution: true });
};
