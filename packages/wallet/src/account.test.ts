import { Address } from '@fuel-ts/address';
import { BaseAssetId } from '@fuel-ts/address/configs';
import { bn } from '@fuel-ts/math';
import type {
  CallResult,
  Coin,
  CoinQuantity,
  Message,
  Resource,
  TransactionRequestLike,
} from '@fuel-ts/providers';
import { TransactionResponse, ScriptTransactionRequest, Provider } from '@fuel-ts/providers';
import * as providersMod from '@fuel-ts/providers';

import type { TxParamsType } from './account';
import { Account } from './account';
import { FUEL_NETWORK_URL } from './configs';

let provider: Provider;

afterEach(() => {
  vi.restoreAllMocks();
});

beforeAll(async () => {
  provider = await Provider.create(FUEL_NETWORK_URL);
});

/**
 * @group node
 */
describe('Account', () => {
  const assets = [
    '0x0101010101010101010101010101010101010101010101010101010101010101',
    '0x0202020202020202020202020202020202020202020202020202020202020202',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ];

  it('should create account using an address, with a provider', () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    expect(account.address.toB256()).toEqual(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db'
    );
  });

  it('should create account using an address, without a provider', () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db'
    );
    expect(account.address.toB256()).toEqual(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db'
    );
  });

  it('should throw an error when using a provider dependent method, without a provider', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db'
    );
    await expect(() => account.getBalance()).rejects.toThrow(/Provider not set/);
  });

  it('should get coins just fine', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    const coins = await account.getCoins();
    const assetA = coins.find((c) => c.assetId === assets[0]);
    expect(assetA?.amount.gt(1)).toBeTruthy();
    const assetB = coins.find((c) => c.assetId === assets[1]);
    expect(assetB?.amount.gt(1)).toBeTruthy();
    const assetC = coins.find((c) => c.assetId === assets[2]);
    expect(assetC?.amount.gt(1)).toBeTruthy();
  });

  it('should throw if coins length is higher than 9999', async () => {
    const dummyCoins: Coin[] = new Array(10000);

    vi.spyOn(Provider.prototype, 'getCoins').mockImplementation(async () =>
      Promise.resolve(dummyCoins)
    );

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    let result;
    let error;

    try {
      result = await account.getCoins();
    } catch (err) {
      error = err;
    }

    expect(result).toBeUndefined();
    expect((<Error>error).message).toEqual(
      'Wallets containing more than 9999 coins exceed the current supported limit.'
    );
  });

  it('should execute getResourcesToSpend just fine', async () => {
    // #region Message-getResourcesToSpend
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    const resourcesToSpend = await account.getResourcesToSpend([
      {
        amount: bn(2),
        assetId: '0x0101010101010101010101010101010101010101010101010101010101010101',
      },
    ]);
    expect(resourcesToSpend[0].amount.gt(2)).toBeTruthy();
    // #endregion Message-getResourcesToSpend
  });

  it('getResourcesToSpend should work with <1 amount', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    const resourcesToSpend = await account.getResourcesToSpend([
      {
        amount: 0.9,
        assetId: '0x0101010101010101010101010101010101010101010101010101010101010101',
      },
    ]);
    expect(resourcesToSpend[0].amount.gte(1)).toBeTruthy();
  });

  it('should get messages just fine', async () => {
    const account = new Account(
      '0x69a2b736b60159b43bb8a4f98c0589f6da5fa3a3d101e8e269c499eb942753ba',
      provider
    );
    const messages = await account.getMessages();
    expect(messages.length).toEqual(1);
  });

  it('should throw if messages length is higher than 9999', async () => {
    const dummyMessages: Message[] = new Array(10000);

    vi.spyOn(Provider.prototype, 'getMessages').mockImplementation(async () =>
      Promise.resolve(dummyMessages)
    );

    const account = new Account(
      '0x69a2b736b60159b43bb8a4f98c0589f6da5fa3a3d101e8e269c499eb942753ba',
      provider
    );

    let result;
    let error;

    try {
      result = await account.getMessages();
    } catch (err) {
      error = err;
    }

    expect(result).toBeUndefined();
    expect((<Error>error).message).toEqual(
      'Wallets containing more than 9999 messages exceed the current supported limit.'
    );
  });

  it('should get single asset balance just fine', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    const balanceA = await account.getBalance(); // native asset
    const balanceB = await account.getBalance(assets[1]);
    expect(balanceA.gte(1)).toBeTruthy();
    expect(balanceB.gte(1)).toBeTruthy();
  });

  it('should get multiple balances just fine', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    const balances = await account.getBalances();
    expect(balances.length).toBeGreaterThanOrEqual(1);
  });

  it('should throw if balances length is higher than 9999', async () => {
    const dummyBalances: CoinQuantity[] = new Array(10000);

    vi.spyOn(Provider.prototype, 'getBalances').mockImplementation(async () =>
      Promise.resolve(dummyBalances)
    );

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    let result;
    let error;
    try {
      result = await account.getBalances();
    } catch (err) {
      error = err;
    }

    expect(result).toBeUndefined();
    expect((<Error>error).message).toEqual(
      'Wallets containing more than 9999 balances exceed the current supported limit.'
    );
  });

  it('should connect with provider just fine [INSTANCE]', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    const newProviderInstance = await Provider.create(FUEL_NETWORK_URL);

    expect(account.provider).not.toBe(newProviderInstance);

    account.connect(newProviderInstance);

    expect(account.provider).toBe(newProviderInstance);
    expect(account.provider).not.toBe(provider);
  });

  it('should be able to set a provider', async () => {
    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );
    const newProviderInstance = await Provider.create(FUEL_NETWORK_URL);

    expect(account.provider).not.toBe(newProviderInstance);

    account.provider = newProviderInstance;

    expect(account.provider).toBe(newProviderInstance);
    expect(account.provider).not.toBe(provider);
  });

  it('should execute fund just as fine', async () => {
    const quantities: CoinQuantity[] = [
      {
        amount: bn(10),
        assetId: '0x0101010101010101010101010101010101010101010101010101010101010101',
      },
    ];
    const fee = bn(29);

    const request = new ScriptTransactionRequest();

    const resourcesToSpend: Resource[] = [];
    const getResourcesToSpendSpy = vi
      .spyOn(Account.prototype, 'getResourcesToSpend')
      .mockImplementationOnce(() => Promise.resolve(resourcesToSpend));

    const addResourcesSpy = vi.spyOn(request, 'addResources');

    const addAmountToAssetSpy = vi.spyOn(providersMod, 'addAmountToAsset');

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    await account.fund(request, quantities, fee);

    expect(addAmountToAssetSpy).toBeCalledTimes(1);
    expect(addAmountToAssetSpy).toHaveBeenCalledWith({
      amount: bn(fee),
      assetId: BaseAssetId,
      coinQuantities: quantities,
    });

    const expectedTotalResources = [
      { amount: bn(quantities[0].amount), assetId: quantities[0].assetId },
      { amount: bn(fee), assetId: BaseAssetId },
    ];
    expect(getResourcesToSpendSpy).toBeCalledTimes(1);
    expect(getResourcesToSpendSpy).toBeCalledWith(expectedTotalResources, {
      messages: [],
      utxos: [],
    });

    expect(addResourcesSpy).toBeCalledTimes(1);
    expect(addResourcesSpy).toHaveBeenCalledWith(resourcesToSpend);
  });

  it('should execute transfer just as fine', async () => {
    const amount = bn(1);
    const assetId = '0x0101010101010101010101010101010101010101010101010101010101010101';
    const destination = Address.fromAddressOrString(
      '0x0202020202020202020202020202020202020202020202020202020202020202'
    );
    const txParam: TxParamsType = {
      gasLimit: bn(1),
      gasPrice: bn(1),
      maturity: 1,
    };

    const transactionCost: providersMod.TransactionCost = {
      gasUsed: bn(234),
      gasPrice: bn(1),
      minGasPrice: bn(1),
      maxFee: bn(2),
      minFee: bn(1),
      receipts: [],
      requiredQuantities: [],
      maxGas: bn(1),
      minGas: bn(1),
      usedFee: bn(1),
    };

    const request = new ScriptTransactionRequest();
    vi.spyOn(providersMod, 'ScriptTransactionRequest').mockImplementation(() => request);

    const transactionResponse = new TransactionResponse('transactionId', provider);

    const addCoinOutputSpy = vi.spyOn(request, 'addCoinOutput');

    const fundSpy = vi.spyOn(Account.prototype, 'fund').mockImplementation(() => Promise.resolve());

    const sendTransactionSpy = vi
      .spyOn(Account.prototype, 'sendTransaction')
      .mockImplementation(() => Promise.resolve(transactionResponse));

    const getTransactionCost = vi
      .spyOn(Provider.prototype, 'getTransactionCost')
      .mockImplementation(() => Promise.resolve(transactionCost));

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    await account.transfer(destination, amount, assetId, txParam);

    expect(addCoinOutputSpy).toHaveBeenCalledTimes(1);
    expect(addCoinOutputSpy).toHaveBeenCalledWith(destination, amount, assetId);

    expect(getTransactionCost).toHaveBeenCalledTimes(1);

    expect(fundSpy).toHaveBeenCalledTimes(1);
    expect(fundSpy).toHaveBeenCalledWith(
      request,
      transactionCost.requiredQuantities,
      transactionCost.maxFee
    );

    expect(sendTransactionSpy).toHaveBeenCalledTimes(1);
    expect(sendTransactionSpy).toHaveBeenCalledWith(request);
  });

  it('should execute withdrawToBaseLayer just fine', async () => {
    const recipient = Address.fromRandom();
    const txParams: TxParamsType = {};
    const amount = bn(1);

    const assetId = '0x0101010101010101010101010101010101010101010101010101010101010101';

    const request = new ScriptTransactionRequest();

    const quantities: CoinQuantity[] = [
      {
        amount: bn(1),
        assetId,
      },
    ];
    const cost: providersMod.TransactionCost = {
      gasPrice: bn(1),
      gasUsed: bn(1),
      maxFee: bn(1),
      maxGas: bn(1),
      minFee: bn(1),
      minGas: bn(1),
      minGasPrice: bn(1),
      receipts: [],
      requiredQuantities: quantities,
      usedFee: bn(1),
    };

    const transactionResponse = {} as unknown as TransactionResponse;

    const scriptTransactionRequest = vi
      .spyOn(providersMod, 'ScriptTransactionRequest')
      .mockImplementation(() => request);

    const getTransactionCost = vi
      .spyOn(providersMod.Provider.prototype, 'getTransactionCost')
      .mockImplementation(() => Promise.resolve(cost));

    const fund = vi.spyOn(Account.prototype, 'fund').mockImplementation(() => Promise.resolve());

    const sendTransaction = vi
      .spyOn(Account.prototype, 'sendTransaction')
      .mockImplementation(() => Promise.resolve(transactionResponse));

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    let result = await account.withdrawToBaseLayer(recipient, amount, txParams);

    expect(result).toEqual(transactionResponse);

    expect(scriptTransactionRequest).toHaveBeenCalledTimes(1);

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith(request);

    expect(getTransactionCost).toHaveBeenCalledTimes(1);
    expect(fund).toHaveBeenCalledTimes(1);

    // without txParams
    result = await account.withdrawToBaseLayer(recipient, amount);

    expect(result).toEqual(transactionResponse);

    expect(scriptTransactionRequest).toHaveBeenCalledTimes(2);

    expect(sendTransaction).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledWith(request);
  });

  it('should execute sendTransaction just fine', async () => {
    const transactionRequestLike: TransactionRequestLike = {
      type: providersMod.TransactionType.Script,
    };
    const transactionRequest = new ScriptTransactionRequest();
    const transactionResponse = 'transactionResponse' as unknown as TransactionResponse;

    const transactionRequestify = vi.spyOn(providersMod, 'transactionRequestify');

    const estimateTxDependencies = vi
      .spyOn(providersMod.Provider.prototype, 'estimateTxDependencies')
      .mockImplementation(() => Promise.resolve());

    const sendTransaction = vi
      .spyOn(providersMod.Provider.prototype, 'sendTransaction')
      .mockImplementation(() => Promise.resolve(transactionResponse));

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    const result = await account.sendTransaction(transactionRequestLike);

    expect(result).toEqual(transactionResponse);

    expect(transactionRequestify.mock.calls.length).toEqual(1);
    expect(transactionRequestify.mock.calls[0][0]).toEqual(transactionRequestLike);

    expect(estimateTxDependencies.mock.calls.length).toBe(1);
    expect(estimateTxDependencies.mock.calls[0][0]).toEqual(transactionRequest);

    expect(sendTransaction.mock.calls.length).toEqual(1);
    expect(sendTransaction.mock.calls[0][0]).toEqual(transactionRequest);
  });

  it('should execute simulateTransaction just fine', async () => {
    const transactionRequestLike: TransactionRequestLike = {
      type: providersMod.TransactionType.Script,
    };
    const transactionRequest = new ScriptTransactionRequest();
    const callResult = 'callResult' as unknown as CallResult;

    const transactionRequestify = vi
      .spyOn(providersMod, 'transactionRequestify')
      .mockImplementation(() => transactionRequest);

    const estimateTxDependencies = vi
      .spyOn(providersMod.Provider.prototype, 'estimateTxDependencies')
      .mockImplementation(() => Promise.resolve());

    const simulate = vi
      .spyOn(providersMod.Provider.prototype, 'simulate')
      .mockImplementation(() => Promise.resolve(callResult));

    const account = new Account(
      '0x09c0b2d1a486c439a87bcba6b46a7a1a23f3897cc83a94521a96da5c23bc58db',
      provider
    );

    const result = await account.simulateTransaction(transactionRequestLike);

    expect(result).toEqual(callResult);

    expect(estimateTxDependencies.mock.calls.length).toBe(1);
    expect(estimateTxDependencies.mock.calls[0][0]).toEqual(transactionRequest);

    expect(transactionRequestify.mock.calls.length).toBe(1);
    expect(transactionRequestify.mock.calls[0][0]).toEqual(transactionRequestLike);

    expect(simulate.mock.calls.length).toBe(1);
    expect(simulate.mock.calls[0][0]).toEqual(transactionRequest);
  });
});
