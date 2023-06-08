import { constants, ethers } from "ethers";
import { jsonifyError } from "@connext/nxtp-utils";
import { AlphaRouter, ChainId, SwapOptionsSwapRouter02, SwapRoute, SwapType } from "@uniswap/smart-order-router";
import { TradeType, CurrencyAmount, Percent } from "@uniswap/sdk-core";

import { axiosGet } from "../mockable";
import { DestinationSwapForwarderParams } from "../types";
import { Token } from "@uniswap/sdk-core";

export type OriginSwapDataCallbackArgs = {
  chainId: number;
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  fromAddress: string;
  slippage?: number;
};
export type OriginSwapDataCallback = (args: OriginSwapDataCallbackArgs) => Promise<string>;
export type DestinationSwapDataCallback = (args: DestinationSwapForwarderParams) => Promise<string>;

// ==================================== ORIGIN SIDE ==================================== //
/**
 * Returns the `swapData` which will be used as the low-level calldata
 * including a function signature for any univ2 DEXes.
 */
export const getOriginSwapDataForUniV2 = async (_args: OriginSwapDataCallbackArgs): Promise<string> => {
  throw new Error("ToDo");
};

/**
 * Returns the `swapData` which will be used as the low-level calldata
 * including a function signature for any univ3 DEXes.
 */
export const getOriginSwapDataForUniV3 = async (_args: OriginSwapDataCallbackArgs): Promise<string> => {
  throw new Error("ToDo");
};

/**
 * Returns the `swapData` which will be used as the low-level calldata
 * including a function signature for the 1inch aggregator.
 */
export const getOriginSwapDataForOneInch = async (args: OriginSwapDataCallbackArgs): Promise<string> => {
  const fromAsset =
    args.fromAsset == constants.AddressZero ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : args.fromAsset;
  const toAsset = args.toAsset == constants.AddressZero ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : args.toAsset;
  try {
    const slippage = args.slippage ?? 1;
    const apiEndpoint = `https://api.1inch.io/v5.0/${args.chainId}/swap?fromTokenAddress=${fromAsset}&toTokenAddress=${toAsset}&amount=${args.amountIn}&fromAddress=${args.fromAddress}&slippage=${slippage}&disableEstimate=true`;

    const res = await axiosGet(apiEndpoint);
    return res.data.tx.data;
  } catch (error: unknown) {
    throw new Error(`Getting swapdata from 1inch failed, e: ${jsonifyError(error as Error).message}`);
  }
};

// ==================================== DESTINATION SIDE ==================================== //
/**
 * Returns the `swapData` which will be used on the destination univ2 swapper
 */
export const getDestinationSwapDataForUniV2 = async (args: DestinationSwapForwarderParams): Promise<string> => {
  return "";
  //return defaultAbiCoder.encode(["uint256", "address[]"], [args.amountOutMin, args.path]);
};

/**
 * Returns the `swapData` which will be used on the destination univ3 swapper
 */
export const getDestinationSwapDataForUniV3 = async (args: DestinationSwapForwarderParams): Promise<string> => {
  const route = await generateRoute(args);

  //return defaultAbiCoder.encode(["uint256", "bytes"], [args.amountOutMin, args.path]);
};

/**
 * Returns the `swapData` which will be used on the destination 1inch swapper
 */
export const getDestinationSwapDataForOneInch = async (_args: DestinationSwapForwarderParams): Promise<string> => {
  throw new Error("ToDo");
};

export async function generateRoute(args: DestinationSwapForwarderParams): Promise<SwapRoute | null> {
  const router = new AlphaRouter({
    chainId: ChainId.MAINNET,
    provider: new ethers.providers.JsonRpcProvider("mainnet rpc"),
  });

  const options: SwapOptionsSwapRouter02 = {
    recipient: args.fromAddress,
    slippageTolerance: new Percent(args.slippage ?? 5, 100),
    deadline: Math.floor(Date.now() / 1000 + 1800),
    type: SwapType.SWAP_ROUTER_02,
  };

  const route = await router.route(
    CurrencyAmount.fromRawAmount(new Token(args.chainId, args.fromAsset, 18, "USDC", "USD//C"), args.amountIn),
    new Token(args.chainId, args.toAsset, 18, "USDC", "USD//C"),
    TradeType.EXACT_INPUT,
    options,
  );

  return route;
}
