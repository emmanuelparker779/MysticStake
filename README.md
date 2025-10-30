# MysticStake

MysticStake is a privacy-first staking protocol that allows players to claim, stake, and withdraw STK points while keeping every balance fully encrypted. The project marries Zama’s Fully Homomorphic Encryption Virtual Machine (FHEVM) with a modern React front end so users can interact with confidential smart contracts through a clean, wallet-connected interface.

## Overview

Traditional staking systems expose sensitive balances on-chain and require users to trust opaque operators. MysticStake demonstrates how FHE-enabled Solidity unlocks encrypted staking where deposits, withdrawals, and reward claims are computed without revealing amounts. The repository contains the complete toolchain from contract authoring to a production-ready front end backed by automated tasks, tests, and deployment scripts.

## Key Advantages

- **Confidential staking**: All STK balances, stakes, and withdrawals stay encrypted end-to-end through Zama’s FHEVM.
- **User-owned keys**: The protocol is non-custodial; users interact directly through their own wallets via RainbowKit connectors.
- **Auditable automation**: Hardhat tasks and tests verify the encrypted flows before any deployment, ensuring consistent on-chain behavior.
- **Full-stack delivery**: A Vite-powered interface consumes the generated contract ABI and connects to Sepolia without relying on localhost networks or browser storage.
- **Future-proof foundation**: The architecture is modular, making it easy to extend staking mechanics, analytics, or governance without breaking privacy guarantees.

## Technology Stack

- **Smart contracts**: Solidity 0.8.x on Hardhat with TypeScript tooling.
- **Privacy layer**: Zama FHEVM libraries for encrypted arithmetic and authenticated ciphertext handling.
- **Tooling**: Hardhat Deploy, TypeChain, and custom tasks for lifecycle automation.
- **Frontend**: React 18, Vite, Viem for read operations, ethers.js for state changes, and RainbowKit for wallet onboarding.
- **Build & quality**: ESLint, ts-node, and npm scripts for compilation, linting, coverage, and cleanup.

## Problems We Solve

- **On-chain exposure**: Standard staking reveals every deposit and withdrawal. MysticStake processes encrypted values, preserving user confidentiality even on public networks.
- **Fragmented developer workflows**: The mono-repo integrates contracts, deployments, and UI, eliminating manual ABI syncing and RPC misconfiguration.
- **Operational risk**: Automated tasks, tests, and deterministic deployments harden the project against human error when moving between local, testnet, and future mainnet environments.

## Core Features

- **Claim encrypted STK rewards** through a Zama FHEVM-compatible contract.
- **Stake STK privately**, locking encrypted balances while preserving user custody.
- **Withdraw with confidentiality**, enabling partial or full exits without revealing amounts.
- **Dynamic front end**, sourcing ABIs from `deployments/sepolia` to stay aligned with the latest contract build.

## Architecture

- **`contracts/`** – Contains `MysticStake.sol`, implementing encrypted reward, stake, and withdraw flows without relying on `msg.sender` inside view functions.
- **`deploy/`** – Hardhat deploy scripts that load secrets via `dotenv`, using `process.env.PRIVATE_KEY` and `process.env.INFURA_API_KEY` for authenticated broadcasts.
- **`tasks/`** – Operational shortcuts to inspect ciphertexts, trigger workflows, and seed the protocol for demos.
- **`test/`** – Comprehensive unit tests that assert encrypted logic using Zama’s simulation utilities.
- **`deployments/`** – Network-specific metadata and ABIs consumed by the front end; these files are the single source of truth for UI integration.
- **`ui/`** – Vite-based React application (folder name `home` within the product vision) that renders staking dashboards, wallet connection, and encrypted transaction flows without Tailwind CSS or environment variables.

## Prerequisites

- Node.js 20+
- npm (bundled with Node 20)
- An Ethereum wallet private key with Sepolia funds for contract deployment
- Infura project ID for RPC access

## Installation

1. **Install root dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables**  
   Create a `.env` file alongside `hardhat.config.ts`:
   ```bash
   PRIVATE_KEY=<your_wallet_private_key>
   INFURA_API_KEY=<your_infura_project_id>
   # Optional: ETHERSCAN_API_KEY=<etherscan_api_key>
   ```
   The deployment scripts load secrets with `import * as dotenv from "dotenv"; dotenv.config();` and never use mnemonics.
3. **Compile contracts**
   ```bash
   npm run compile
   ```
4. **Run automated tests**
   ```bash
   npm run test
   ```

## Development Workflow

### Local FHEVM workflow

```bash
# Start a local FHE-ready node
npx hardhat node
# Deploy encrypted contracts to the local network
npx hardhat deploy --network localhost
```

### Sepolia deployment

```bash
# Deploy using PRIVATE_KEY and INFURA_API_KEY from .env
npx hardhat deploy --network sepolia
# (Optional) Verify the contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Contract interaction helpers

Explore the `tasks/` directory for scripted operations such as fetching encrypted balances, seeding test stakes, or validating withdrawal flows:

```bash
npx hardhat help
```

## Frontend Usage (`ui/`)

```bash
cd ui
npm install
npm run dev
```

- Reads use Viem clients pointing at Sepolia, while writes rely on ethers.js signers injected by RainbowKit.
- Contract metadata is loaded from `deployments/<network>` to keep the UI synchronized with on-chain addresses and ABIs.
- The interface avoids Tailwind CSS, browser `localStorage`, and environment variables by design, aligning with project requirements.

For production builds:

```bash
npm run build
npm run preview
```

## Testing & Quality

- `npm run test` – Executes Hardhat unit tests with encrypted assertions.
- `npm run coverage` – Produces a coverage report for contract logic.
- `npm run lint` – Enforces coding standards across TypeScript sources.
- `npm run clean` – Clears caches and build artifacts for reproducible runs.

## Future Plans

- **Encrypted governance**: Introduce voting on staking parameters using the same FHE primitives.
- **Reward optimization**: Expand the reward curve with dynamic, privacy-preserving incentives.
- **Cross-network deployments**: Extend beyond Sepolia once mainnet FHE support stabilizes.
- **Analytics relay**: Build privacy-aware dashboards that aggregate ciphertext insights without exposing raw stakes.
- **Security reviews**: Commission third-party audits tailored to Zama’s FHEVM semantics.

## Resources

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Hardhat Integration Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [MysticStake Deployments](deployments/)

## License

MysticStake is distributed under the BSD-3-Clause-Clear License. Refer to [LICENSE](LICENSE) for the full text.
