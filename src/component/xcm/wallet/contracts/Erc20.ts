import { ContractConfig } from '@moonbeam-network/xcm-builder';
import { PublicClient, parseAbi } from 'viem';
import { EvmClient } from '../evm';

const ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export class Erc20 {
  readonly #provider: PublicClient;

  constructor(client: EvmClient) {
    this.#provider = client.getProvider();
  }

  async getBalance(config: ContractConfig): Promise<bigint> {
    const { address, args } = config;
    const [recipient] = args;

    return await this.#provider.readContract({
      address: address as `0x${string}`,
      abi: ABI,
      functionName: 'balanceOf',
      args: [recipient as `0x${string}`],
    });
  }

  async getDecimals(config: ContractConfig): Promise<number> {
    const { address } = config;

    return await this.#provider.readContract({
      address: address as `0x${string}`,
      abi: ABI,
      functionName: 'decimals',
    });
  }
}
