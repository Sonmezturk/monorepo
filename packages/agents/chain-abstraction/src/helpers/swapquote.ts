import { constants } from "ethers";
import { jsonifyError } from "@connext/nxtp-utils";
import { create, SdkConfig } from "@connext/sdk-core";

import { axiosGet, getContract, JsonRpcProvider } from "../mockable";

import { UniV2RouterABI, UniV3QuoterABI } from "./abis";

export type SwapQuoteCallbackArgs = {
  chainId: number;
  quoter: string;
  rpc: string;
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  fee?: string;
  sqrtPriceLimitX96?: string;
};

export type EstimateQuoteAmountArgs = {
  originDomain: number;
  destinationDomain: number;
  originRpc: string;
  destinationRpc: string;
  fromAsset: string;
  toAsset: string;
  underlyingAsset?: string;
  amountIn: string;
  swapper: string;
  signerAddress: string;
  fee?: string;
  originDecimals?: number;
  destinationDecimals?: number;
};

export type SwapQuoteCallback = (args: SwapQuoteCallbackArgs) => Promise<string>;

/**
 * Returns the `amountOut` from the uniswap v2 router
 */
export const getSwapQuoteForUniV2 = async (_args: SwapQuoteCallbackArgs): Promise<string> => {
  const { amountIn, quoter, rpc, fromAsset, toAsset } = _args;
  const rpcProvider = new JsonRpcProvider(rpc);
  const v2RouterContract = getContract(quoter, UniV2RouterABI, rpcProvider);
  const res = await v2RouterContract.getAmountsOut(amountIn, [fromAsset, toAsset]);
  return res[1].toString();
};

/**
 * Returns the `amountOut` from the uniswap v3 quoter
 */
export const getSwapQuoteForUniV3 = async (_args: SwapQuoteCallbackArgs): Promise<string> => {
  const { amountIn, quoter, rpc, fromAsset, toAsset, fee, sqrtPriceLimitX96: _sqrtPriceLimitX96 } = _args;
  const rpcProvider = new JsonRpcProvider(rpc);
  const v3QuoterV2Contract = getContract(quoter, UniV3QuoterABI, rpcProvider);
  const res = await v3QuoterV2Contract.callStatic.quoteExactInputSingle({
    tokenIn: fromAsset,
    tokenOut: toAsset,
    amountIn,
    fee,
    sqrtPriceLimitX96: _sqrtPriceLimitX96 ?? 0,
  });
  return res[0].toString();
};

/**
 * Returns the `amountOut` from the 1inch aggregator
 */
export const getSwapQuoteForOneInch = async (args: SwapQuoteCallbackArgs): Promise<string> => {
  const fromAsset =
    args.fromAsset == constants.AddressZero ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : args.fromAsset;
  const toAsset = args.toAsset == constants.AddressZero ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : args.toAsset;
  try {
    const apiEndpoint = `https://api.1inch.io/v5.0/${args.chainId}/quote?fromTokenAddress=${fromAsset}&toTokenAddress=${toAsset}&amount=${args.amountIn}`;

    const res = await axiosGet(apiEndpoint);
    return res.data.toTokenAmount;
  } catch (error: unknown) {
    throw new Error(`Getting quote from 1inch failed, e: ${jsonifyError(error as Error).message}`);
  }
};

export const initCoreSDK = async (
  signerAddress: string,
  originDomain: number,
  destinationDomain: number,
  originRPC: string,
  destinationRPC: string,
) => {
  const domainConfig: { [domainId: string]: { providers: string[] } } = {};
  domainConfig[originDomain.toString()] = { providers: [originRPC] };
  domainConfig[destinationDomain.toString()] = { providers: [destinationRPC] };

  const sdkConfig: SdkConfig = {
    signerAddress,
    network: "mainnet", // can change it to testnet as well
    chains: domainConfig,
  };

  const { sdkBase } = await create(sdkConfig);
  return { sdkBase };
};
