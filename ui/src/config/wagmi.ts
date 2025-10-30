import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'MysticStake',
  projectId: 'f08c2b1b5d27464ba2ac9ee3b0ebadc1',
  chains: [sepolia],
  ssr: false,
});
